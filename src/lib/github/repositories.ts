// Repositories starred on GitHub, merged into the curated project collection.
// Fetched on the server (see ./starred.ts); everything here is plain data and
// pure functions, shared by the world's panels and the HTML page.
//
// Only repositories the portfolio's own account owns, and that aren't forks,
// are kept: starring someone else's repository never puts it in the Projects
// section.

import { PROJECTS } from "@/content/projects";
import { GITHUB_USER } from "@/content/social";

export type Repository = {
  // "owner/name", from the canonical URL.
  fullName: string;
  name: string;
  // The repository's page: GitHub's own html_url, validated and normalized.
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  topics: string[];
  // When it was starred (ISO 8601), if GitHub said.
  starredAt: string | null;
};

// What the last sync produced. "unavailable": GitHub couldn't be reached (or
// refused) and there was no earlier result to fall back on.
export type StarredSync = { status: "ok"; repositories: Repository[] } | { status: "unavailable" };

// GitHub facts for a curated project: always its URL; language and stars once
// the repository has come through the sync.
export type ProjectRepository = { url: string; language: string | null; stars: number | null };

// Everything the Projects section shows besides the curated entries.
export type ProjectCollection = {
  // Per curated project id, its repository.
  curated: Record<string, ProjectRepository>;
  // Starred repositories that aren't already a curated project, most recently
  // starred first.
  repositories: Repository[];
  unavailable: boolean;
};

// ── Validation ─────────────────────────────────────────────────────────────
// GitHub's response is untrusted input: every field is checked, trimmed and
// capped. Text is only ever rendered as text, never as HTML. Anything that
// doesn't validate is dropped, so a malformed entry can only ever be missing,
// never shown under the wrong owner or with a foreign link.

const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO_NAME = /^[A-Za-z0-9._-]{1,100}$/;
const TOPIC = /^[a-z0-9][a-z0-9-]{0,49}$/;
const MAX_DESCRIPTION = 280;
const MAX_TOPICS = 8;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const sameLogin = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function cleanText(v: unknown, max: number) {
  if (typeof v !== "string") return null;
  // Drop control characters, collapse whitespace.
  const text = v.replace(/\p{Cc}/gu, " ").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// A repository's page as "https://github.com/owner/name", or null for anything
// else: another host or scheme, credentials, a port, a query or fragment, a
// deeper path, or names GitHub doesn't allow. A trailing slash is dropped.
export function normalizeRepositoryUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "github.com" || url.port || url.username || url.password) return null;
  if (url.search || url.hash) return null;
  const parts = url.pathname.replace(/\/$/, "").split("/").slice(1);
  if (parts.length !== 2 || !LOGIN.test(parts[0]) || !REPO_NAME.test(parts[1]) || /^\.+$/.test(parts[1])) return null;
  return `https://github.com/${parts[0]}/${parts[1]}`;
}

// Same repository, whatever the letter case.
const urlKey = (url: string) => url.toLowerCase();

// One entry of /users/{user}/starred, requested with the star+json media type
// ({ starred_at, repo }); a bare repository object is accepted too. Returns
// null unless the repository is public, not a fork, and owned by GITHUB_USER
// right now.
export function toRepository(entry: unknown): Repository | null {
  if (!isRecord(entry)) return null;
  const repo = isRecord(entry.repo) ? entry.repo : entry;
  if (repo.private !== false && repo.private !== undefined) return null;

  // Ownership: the repository's current owner login, not who starred it.
  const login = isRecord(repo.owner) && typeof repo.owner.login === "string" ? repo.owner.login : "";
  if (!LOGIN.test(login) || !sameLogin(login, GITHUB_USER)) return null;
  // Forks are copies of someone else's work, even under this account. GitHub
  // always reports `fork`; anything but an explicit false is left out. (The API
  // records the current owner only, so a repository transferred to this
  // account from someone else would still pass; one transferred away won't.)
  if (repo.fork !== false) return null;

  // The link must be this repository's own page, and agree with the owner and
  // full name GitHub reported.
  const url = normalizeRepositoryUrl(repo.html_url);
  if (!url) return null;
  const fullName = url.slice("https://github.com/".length);
  const [urlOwner, name] = fullName.split("/");
  if (!sameLogin(urlOwner, login)) return null;
  if (typeof repo.full_name !== "string" || repo.full_name.toLowerCase() !== fullName.toLowerCase()) return null;

  const stars = typeof repo.stargazers_count === "number" && Number.isFinite(repo.stargazers_count) ? Math.max(0, Math.floor(repo.stargazers_count)) : 0;
  const topics = Array.isArray(repo.topics)
    ? [...new Set(repo.topics.filter((t): t is string => typeof t === "string" && TOPIC.test(t)))].slice(0, MAX_TOPICS)
    : [];
  const starred = typeof entry.starred_at === "string" ? Date.parse(entry.starred_at) : NaN;

  return {
    fullName,
    name,
    url,
    description: cleanText(repo.description, MAX_DESCRIPTION),
    language: cleanText(repo.language, 40),
    stars,
    topics,
    starredAt: Number.isNaN(starred) ? null : new Date(starred).toISOString(),
  };
}

// ── Merging with the curated projects ──────────────────────────────────────

const simplify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Curated projects with a repository, by canonical URL.
const CURATED_URLS = PROJECTS.flatMap((p) => {
  const url = p.repository ? normalizeRepositoryUrl(`https://github.com/${p.repository}`) : null;
  return url ? [{ project: p, url }] : [];
});

// The curated project a starred repository already is: named in the project's
// `repository` field, or one without a repository whose id or short name is
// the repository's name.
function curatedFor(repo: Repository) {
  const key = urlKey(repo.url);
  return (
    CURATED_URLS.find((c) => urlKey(c.url) === key)?.project ??
    PROJECTS.find((p) => !p.repository && [p.id, p.shortName].some((n) => simplify(n) === simplify(repo.name)))
  );
}

export function collectProjects(sync: StarredSync): ProjectCollection {
  // Curated projects link to their repository even when GitHub is unreachable.
  const curated: Record<string, ProjectRepository> = {};
  for (const { project, url } of CURATED_URLS) curated[project.id] = { url, language: null, stars: null };
  if (sync.status === "unavailable") return { curated, repositories: [], unavailable: true };

  const seen = new Set<string>();
  const repositories: Repository[] = [];
  for (const repo of sync.repositories) {
    // Checked again here, so nothing that skipped validation gets through.
    if (normalizeRepositoryUrl(repo.url) !== repo.url || !sameLogin(repo.fullName.split("/")[0], GITHUB_USER)) continue;
    const key = urlKey(repo.url);
    if (seen.has(key)) continue;
    seen.add(key);
    const project = curatedFor(repo);
    // Merged into the curated project: GitHub's URL (it follows renames),
    // language and stars. The curated description and technologies stay.
    if (project) curated[project.id] = { url: repo.url, language: repo.language, stars: repo.stars };
    else repositories.push(repo);
  }
  // Most recently starred first (the times are all ISO 8601 UTC, so they sort
  // as text); entries without a time keep GitHub's order, after them.
  repositories.sort((a, b) => (b.starredAt ?? "").localeCompare(a.starredAt ?? ""));
  return { curated, repositories, unavailable: false };
}

// The curated projects alone, with their own repository links: used where no
// sync result is at hand (the error fallback page).
export const CURATED_ONLY: ProjectCollection = collectProjects({ status: "ok", repositories: [] });

// One-line description of a repository, under its name.
export const repositoryCategory = (repo: Repository) => ["GitHub repository", repo.language].filter(Boolean).join(" · ");
