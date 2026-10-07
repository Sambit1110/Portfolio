"use client";

import { INTERACTABLE_BY_KEY, targetKey } from "@/lib/interactables";
import { useWorldStore } from "@/stores/worldStore";

// "Press E" pill shown while the player stands at something interactive.
// Clickable too.
export function InteractionPrompt() {
  const nearby = useWorldStore((s) => s.nearby);
  const blocked = useWorldStore((s) => s.active !== null || s.menuOpen || s.pageView || s.vistaRequested || s.guidedTour?.phase === "touring");
  const open = useWorldStore((s) => s.open);
  const target = nearby ? INTERACTABLE_BY_KEY.get(targetKey(nearby)) : undefined;
  const visible = target !== undefined && !blocked;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center px-4" aria-live="polite">
      {target && (
        <button
          type="button"
          onClick={() => open({ kind: target.kind, id: target.id })}
          tabIndex={visible ? 0 : -1}
          aria-hidden={!visible}
          className={`pointer-events-auto flex max-w-full items-center gap-3 rounded-full border border-cyan/70 bg-ink/80 py-2 pr-5 pl-2 text-cream shadow-[0_0_24px_rgba(93,224,230,0.35)] backdrop-blur-sm transition duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-95 opacity-0"
          }`}
        >
          <kbd className="grid size-8 shrink-0 place-items-center rounded-lg bg-cream font-display text-base font-semibold text-ink shadow-[inset_0_-2px_0_rgba(47,38,56,0.25)]">
            E
          </kbd>
          <span className="truncate text-[15px] font-medium tracking-wide">{target.action}</span>
        </button>
      )}
    </div>
  );
}
