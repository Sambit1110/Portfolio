"use client";

import { useEffect, useRef, useState } from "react";
import { repositoryCategory } from "@/lib/github/repositories";
import { LIST_BATCH, useProjectCollection } from "./ProjectCollection";
import { RepositoryDetails } from "./RepositoryDetails";

// The page view's GitHub repositories, after the curated projects. Like the
// world's Projects list they come a batch at a time, from data already on the
// page: the first batch is in the server-rendered HTML, "Show more" adds the
// next.
export function RepositoryArticles() {
  const { repositories, unavailable } = useProjectCollection();
  const [shown, setShown] = useState(LIST_BATCH);
  const visible = repositories.slice(0, shown);
  const list = useRef<HTMLDivElement>(null);
  // Article whose heading takes focus once a new batch has rendered.
  const focusIndex = useRef<number | null>(null);

  useEffect(() => {
    if (focusIndex.current === null) return;
    const heading = list.current?.children[focusIndex.current]?.querySelector<HTMLElement>("h3");
    focusIndex.current = null;
    heading?.focus();
  }, [shown]);

  const showMore = () => {
    if (shown >= repositories.length) return;
    focusIndex.current = shown;
    setShown(Math.min(shown + LIST_BATCH, repositories.length));
  };

  return (
    <>
      {visible.length > 0 && (
        <div ref={list} className="mt-10 space-y-10">
          {visible.map((repo) => (
            <article key={repo.url} aria-labelledby={`repository-${repo.fullName}`}>
              <p className="text-sm font-medium text-rock">{repositoryCategory(repo)}</p>
              <h3 id={`repository-${repo.fullName}`} tabIndex={-1} className="mb-3 text-xl font-semibold break-words outline-none">
                {repo.name}
              </h3>
              <RepositoryDetails repo={repo} />
            </article>
          ))}
        </div>
      )}
      {repositories.length > LIST_BATCH && (
        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
          {shown < repositories.length && (
            <button
              type="button"
              onClick={showMore}
              className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium transition hover:bg-sand/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-ink pointer-coarse:min-h-11"
            >
              Show {Math.min(LIST_BATCH, repositories.length - shown)} more repositories
            </button>
          )}
          <p aria-live="polite" className="text-sm text-rock">
            {shown < repositories.length ? `Showing ${shown} of ${repositories.length} GitHub repositories` : `All ${repositories.length} GitHub repositories shown`}
          </p>
        </div>
      )}
      {unavailable && <p className="mt-6 text-sm text-rock">More GitHub repositories can&rsquo;t be loaded right now.</p>}
    </>
  );
}
