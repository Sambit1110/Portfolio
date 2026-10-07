"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useWorldStore } from "@/stores/worldStore";

// Holds the semantic HTML portfolio. Normally visually hidden but always in the
// accessibility tree; shown as a scrollable page in "page view" or without WebGL.
export function ContentLayer({ children }: { children: ReactNode }) {
  const pageView = useWorldStore((s) => s.pageView);
  const worldAvailable = useWorldStore((s) => s.worldAvailable);
  const setPageView = useWorldStore((s) => s.setPageView);
  const layer = useRef<HTMLDivElement>(null);

  // While hidden, its links stay readable by screen readers but leave the Tab
  // order, so keyboard focus never lands on something invisible. Keyboard users
  // reach the page through "Skip to the portfolio as a page".
  useEffect(() => {
    const el = layer.current;
    if (!el) return;
    for (const control of el.querySelectorAll<HTMLElement>("a[href], button")) {
      if (pageView) control.removeAttribute("tabindex");
      else control.setAttribute("tabindex", "-1");
    }
    // Opening the page moves focus into it, so the keyboard scrolls it and screen
    // readers carry on from the portfolio instead of the top of the document.
    if (pageView) el.focus({ preventScroll: true });
  }, [pageView]);

  return (
    <div
      ref={layer}
      id="content-layer"
      tabIndex={pageView ? -1 : undefined}
      className={pageView ? "fixed inset-0 z-20 overflow-y-auto bg-cream font-display outline-none" : "sr-only"}
    >
      {pageView && worldAvailable && (
        <button
          type="button"
          onClick={() => setPageView(false)}
          className="fixed top-4 right-4 z-10 rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream shadow-lg transition hover:bg-rock focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-ink"
        >
          Back to the world
        </button>
      )}
      {children}
    </div>
  );
}
