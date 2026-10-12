import "server-only";
import { GITHUB_USER } from "@/content/social";
import { toRepository, type Repository, type StarredSync } from "./repositories";

// How often (seconds) the starred list is fetched again. Keep in step with
// `revalidate` in src/app/page.tsx, which re-renders the page on the same clock.
const REVALIDATE_S = 1800;
// 100 per page (GitHub's maximum), at most 3 pages: the 300 most recently starred.
const PER_PAGE = 100;
const MAX_PAGES = 3;
const TIMEOUT_MS = 8000;

const FIRST_PAGE = `https://api.github.com/users/${GITHUB_USER}/starred?per_page=${PER_PAGE}&sort=created&direction=desc`;

const headers: Record<string, string> = {
  // star+json adds when each repository was starred.
  Accept: "application/vnd.github.star+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": `${GITHUB_USER}-portfolio`,
};
// Public data needs no token. One may optionally be set on the server for a
// higher rate limit; it is never sent to the browser.
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

// The next page from GitHub's Link header, if it stays on the API.
function nextPage(link: string | null) {
  const next = link?.split(",").find((part) => /rel="next"/.test(part))?.match(/<([^>]+)>/)?.[1];
  return next?.startsWith("https://api.github.com/") ? next : null;
}

async function fetchAll(): Promise<Repository[]> {
  const repositories: Repository[] = [];
  let url: string | null = FIRST_PAGE;
  for (let page = 0; url && page < MAX_PAGES; page++) {
    const res: Response = await fetch(url, { headers, next: { revalidate: REVALIDATE_S }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) {
      const limited = (res.status === 403 || res.status === 429) && (res.headers.get("x-ratelimit-remaining") === "0" || res.headers.has("retry-after"));
      throw new Error(`GitHub starred repositories: ${limited ? "rate limited" : `HTTP ${res.status}`}`);
    }
    const body: unknown = await res.json();
    if (!Array.isArray(body)) throw new Error("GitHub starred repositories: unexpected response");
    for (const entry of body) {
      const repo = toRepository(entry);
      if (repo) repositories.push(repo);
    }
    url = nextPage(res.headers.get("link"));
  }
  return repositories;
}

// The account's public starred repositories, for the Projects section.
//
// When GitHub fails (offline, rate limited, an error):
// - while the site is built, or in development, the Projects section simply
//   goes without them;
// - when the live page is being refreshed in the background, the error is
//   thrown on purpose: Next.js then keeps serving the last page that rendered
//   successfully, with its repositories, and tries again on a later visit.
export async function fetchStarred(): Promise<StarredSync> {
  try {
    return { status: "ok", repositories: await fetchAll() };
  } catch (error) {
    const building = process.env.NEXT_PHASE === "phase-production-build";
    if (building || process.env.NODE_ENV !== "production") {
      console.warn(`${error instanceof Error ? error.message : error}; showing curated projects only.`);
      return { status: "unavailable" };
    }
    throw error;
  }
}
