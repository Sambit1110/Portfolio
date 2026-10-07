"use client";

import { PortfolioContent } from "./PortfolioContent";

// Shown by the app's error boundaries instead of a technical error: a short
// note, a way to try again, and the whole portfolio as HTML.
export function ErrorFallback({ retry }: { retry: () => void }) {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-cream font-display text-ink">
      <div className="mx-auto max-w-2xl px-6 pt-6">
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink px-5 py-3 text-sm text-cream">
          <p>Something went wrong loading the world, so here is the portfolio as a page.</p>
          <button
            type="button"
            onClick={retry}
            className="min-h-9 rounded-full bg-cream px-4 py-1.5 font-medium text-ink transition hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
          >
            Try again
          </button>
        </div>
      </div>
      <PortfolioContent />
    </div>
  );
}
