"use client";

import { ZONES } from "@/content/zones";
import { useWorldStore } from "@/stores/worldStore";

// Compact menu: fast travel to any zone, the HTML view, and a controls reminder.
export function Menu() {
  const open = useWorldStore((s) => s.menuOpen);
  const visited = useWorldStore((s) => s.visited);
  const setMenuOpen = useWorldStore((s) => s.setMenuOpen);
  const travelTo = useWorldStore((s) => s.travelTo);
  const setPageView = useWorldStore((s) => s.setPageView);
  const showVista = useWorldStore((s) => s.showVista);

  const blurAfter = (action: () => void) => () => {
    action();
    // Return keyboard control to the world after choosing.
    (document.activeElement as HTMLElement | null)?.blur();
  };

  return (
    <nav aria-label="World menu" className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="world-menu"
        onClick={() => setMenuOpen(!open)}
        className="flex touch-manipulation items-center gap-2 rounded-full bg-ink/55 py-2 pr-4 pl-3 text-sm font-medium text-cream backdrop-blur-sm transition select-none hover:bg-ink/70 pointer-coarse:min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
      >
        <span aria-hidden="true" className="flex flex-col gap-[3px]">
          <span className="h-0.5 w-3.5 rounded bg-cream" />
          <span className="h-0.5 w-3.5 rounded bg-cream" />
          <span className="h-0.5 w-2.5 rounded bg-cream" />
        </span>
        Menu
      </button>

      <div
        id="world-menu"
        hidden={!open}
        className="absolute top-12 left-0 w-64 rounded-2xl bg-cream/95 p-2 text-ink shadow-[0_16px_40px_rgba(47,38,56,0.25)] backdrop-blur-md"
      >
        <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-[0.18em] text-rock uppercase">Travel to</p>
        <ul>
          {ZONES.map((zone) => (
            <li key={zone.id}>
              <button
                type="button"
                onClick={blurAfter(() => travelTo(zone.id))}
                className="flex w-full items-center justify-between touch-manipulation rounded-xl px-3 py-2 pointer-coarse:py-3 text-left transition hover:bg-sand/50 focus-visible:bg-sand/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-ink"
              >
                <span className="font-medium">{zone.title}</span>
                <span className="text-xs text-rock">{visited.includes(zone.id) ? "Visited" : zone.landmark}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="my-2 h-px bg-rock/15" />
        <button
          type="button"
          onClick={blurAfter(showVista)}
          className="w-full touch-manipulation rounded-xl px-3 py-2 pointer-coarse:py-3 text-left font-medium transition hover:bg-sand/50 focus-visible:bg-sand/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-ink"
        >
          View world
        </button>
        <button
          type="button"
          onClick={() => setPageView(true)}
          className="w-full touch-manipulation rounded-xl px-3 py-2 pointer-coarse:py-3 text-left font-medium transition hover:bg-sand/50 focus-visible:bg-sand/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-ink"
        >
          View as a page
        </button>
        <p className="px-3 pt-2 pb-2 text-xs leading-relaxed text-rock">
          Move with WASD or arrow keys · E or Enter to interact · Esc to close or return
        </p>
      </div>
    </nav>
  );
}
