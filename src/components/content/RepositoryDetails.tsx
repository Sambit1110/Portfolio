import type { ProjectRepository, Repository } from "@/lib/github/repositories";
import { Chips } from "./Chips";

// Fixed locale, so the server and the browser format star counts identically.
const count = new Intl.NumberFormat("en-US");

// "View repository": opens the repository's GitHub page in a new tab.
export function RepositoryLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex touch-manipulation items-center gap-2 rounded-full bg-ink px-4 py-2 font-medium text-cream transition hover:bg-rock focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-ink pointer-coarse:min-h-11 pointer-coarse:px-5"
    >
      View repository
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5.5 3.5h7v7M12.5 3.5l-9 9" />
      </svg>
      <span className="sr-only"> on GitHub (opens in a new tab)</span>
    </a>
  );
}

// A labelled fact: "Language: TypeScript".
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-[0.16em] text-rock uppercase">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}

// A curated project's link to its code, with GitHub's language and star count
// once the sync has them.
export function ProjectRepositoryLink({ repository }: { repository: ProjectRepository }) {
  return (
    <div className="space-y-3">
      {repository.stars !== null && (
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {repository.language && <Fact label="Language">{repository.language}</Fact>}
          <Fact label="Stars">
            <span className="tabular-nums">{count.format(repository.stars)}</span>
          </Fact>
        </dl>
      )}
      <RepositoryLink url={repository.url} />
    </div>
  );
}

// What GitHub says about a repository that has no curated entry. Only GitHub's
// own words: no description is written for it.
export function RepositoryDetails({ repo }: { repo: Repository }) {
  return (
    <div className="space-y-4">
      <p className="leading-relaxed text-ink/80">{repo.description ?? "No description on GitHub."}</p>
      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Fact label="Language">{repo.language ?? "Not specified"}</Fact>
        <Fact label="Stars">
          <span className="tabular-nums">{count.format(repo.stars)}</span>
        </Fact>
      </dl>
      {repo.topics.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-rock uppercase">Topics</p>
          <Chips items={repo.topics} label={`Topics of ${repo.fullName}`} />
        </div>
      )}
      <RepositoryLink url={repo.url} />
    </div>
  );
}
