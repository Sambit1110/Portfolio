"use client";

import { INTERACTABLE_BY_KEY, targetKey } from "@/lib/interactables";
import { useWorldStore } from "@/stores/worldStore";

// Touch counterpart of "Press E": appears lower-right only when something is
// in reach, and opens it exactly as E / Enter would.
export function InteractButton() {
  const nearby = useWorldStore((s) => s.nearby);
  const blocked = useWorldStore((s) => s.active !== null || s.menuOpen || s.pageView || s.vistaRequested || s.guidedTour?.phase === "touring");
  const open = useWorldStore((s) => s.open);
  const target = nearby ? INTERACTABLE_BY_KEY.get(targetKey(nearby)) : undefined;
  const visible = target !== undefined && !blocked;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute"
      style={{ right: "max(1.25rem, env(safe-area-inset-right))", bottom: "max(1.75rem, env(safe-area-inset-bottom))" }}
    >
      {target && (
        <button
          type="button"
          onClick={() => open({ kind: target.kind, id: target.id })}
          tabIndex={visible ? 0 : -1}
          aria-hidden={!visible}
          aria-label={target.action}
          className={`no-callout pointer-events-auto flex min-h-13 max-w-[58vw] touch-manipulation items-center gap-2.5 rounded-full border border-cyan/70 bg-ink/80 py-2 pr-4 pl-2 text-cream shadow-[0_0_24px_rgba(93,224,230,0.35)] backdrop-blur-sm transition duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] select-none active:scale-95 ${
            visible ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-3 scale-95 opacity-0"
          }`}
        >
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-cyan bg-cyan/15">
            <span className="size-2.5 rounded-full bg-cyan shadow-[0_0_8px_rgba(93,224,230,0.9)]" />
          </span>
          <span className="truncate text-[15px] font-medium">{target.action}</span>
        </button>
      )}
    </div>
  );
}
