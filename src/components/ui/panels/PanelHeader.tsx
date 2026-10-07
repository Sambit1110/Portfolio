"use client";

import type { Target } from "@/lib/interactables";
import { useWorldStore } from "@/stores/worldStore";

type PanelHeaderProps = {
  eyebrow: string;
  title: string;
  // Detail panels link back to their zone's overview.
  back?: { label: string; target: Target };
};

export function PanelHeader({ eyebrow, title, back }: PanelHeaderProps) {
  const open = useWorldStore((s) => s.open);
  return (
    <header className="panel-header mb-5">
      {back && (
        <button
          type="button"
          onClick={() => open(back.target)}
          // Touch: a taller hit area, offset by the margins so nothing moves.
          className="mb-3 -ml-1 rounded-md px-1 text-sm font-medium text-cyan-ink hover:underline focus-visible:outline-2 focus-visible:outline-cyan-ink pointer-coarse:-mt-1.5 pointer-coarse:mb-1.5 pointer-coarse:py-1.5"
        >
          ← {back.label}
        </button>
      )}
      <p className="text-xs font-semibold tracking-[0.2em] text-cyan-ink uppercase">{eyebrow}</p>
      {/* Focused when the panel opens, so screen readers announce the title. */}
      <h2 id="panel-title" data-panel-heading tabIndex={-1} className="mt-1 text-[32px] leading-tight font-semibold outline-none">
        {title}
      </h2>
    </header>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return <h3 className="mt-7 mb-3 text-xs font-semibold tracking-[0.18em] text-rock uppercase">{children}</h3>;
}
