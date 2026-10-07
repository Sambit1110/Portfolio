"use client";

import { useEffect, useState } from "react";
import { ZONES, ZONE_BY_ID } from "@/content/zones";
import { useWorldStore, type Discovery } from "@/stores/worldStore";

// How long a discovery is announced; the last one lingers a little longer.
const ANNOUNCE_MS = 2600;
const COMPLETE_MS = 3600;

// The latest discovery while it is being announced, plus its wording. The text
// stays put after `showing` ends so the announcement can fade out.
function useDiscoveryAnnouncement() {
  const discovery = useWorldStore((s) => s.discovery);
  const [expired, setExpired] = useState<Discovery | null>(null);
  const complete = discovery !== null && discovery.count === ZONES.length;

  useEffect(() => {
    if (!discovery) return;
    const timer = setTimeout(() => setExpired(discovery), discovery.count === ZONES.length ? COMPLETE_MS : ANNOUNCE_MS);
    return () => clearTimeout(timer);
  }, [discovery]);

  const text = !discovery ? "" : complete ? "World complete" : `${ZONE_BY_ID[discovery.zone].title} discovered`;
  return { discovery, showing: discovery !== null && discovery !== expired, complete, text };
}

// One dot per zone in content/zones.ts, filled cyan once its content has been
// opened, with the world's progress beside them. A first discovery briefly
// takes over the label; the new dot (or, at the end, every dot) glows once.
// Phones have no room to widen the label, so there the announcement is a chip
// laid briefly over this top-right group instead (taps pass through it).
export function VisitedZones() {
  const visited = useWorldStore((s) => s.visited);
  const { discovery, showing, complete, text } = useDiscoveryAnnouncement();

  return (
    <>
      <div className="flex items-center gap-2.5 rounded-full bg-ink/55 px-3.5 py-2.5 backdrop-blur-sm">
        <span className="sr-only">
          World discovered: {visited.length} of {ZONES.length} zones.
        </span>
        {/* Announced once per discovery, politely, without moving focus. */}
        <span className="sr-only" aria-live="polite">
          {showing ? `${text}. ${discovery?.count} of ${ZONES.length} zones discovered.` : ""}
        </span>

        {/* Hidden on the narrowest phones (under 360 px), where the dots alone fit
            beside the menu. */}
        <span aria-hidden="true" className="grid text-[10px] leading-none font-medium tracking-[0.2em] uppercase max-[359px]:hidden">
          {/* Both labels share one grid cell, so swapping them never shifts the dots. */}
          <span
            className={`col-start-1 row-start-1 text-right text-cream/60 transition-opacity duration-500 ${showing ? "opacity-0" : "opacity-100"}`}
          >
            <span className="max-sm:hidden">World discovered&ensp;</span>
            <span className="text-cream/80 tabular-nums">
              {visited.length} / {ZONES.length}
            </span>
          </span>
          <span
            className={`col-start-1 row-start-1 text-right whitespace-nowrap text-cyan transition-opacity duration-500 max-sm:hidden ${showing ? "opacity-100" : "opacity-0"}`}
          >
            {text}
          </span>
        </span>

        <span aria-hidden="true" className="flex items-center gap-2">
          {ZONES.map((zone) => {
            const seen = visited.includes(zone.id);
            const glowing = showing && (complete || discovery?.zone === zone.id);
            return (
              <span
                // Remounting replays the glow for each new discovery.
                key={glowing ? `${zone.id}:${discovery?.count}` : zone.id}
                title={seen ? zone.title : "Undiscovered"}
                className={`size-2.5 rounded-full transition duration-500 ${
                  seen ? "scale-110 bg-cyan shadow-[0_0_10px_rgba(93,224,230,0.9)]" : "border border-cream/60"
                } ${glowing ? "animate-[discover-glow_900ms_cubic-bezier(0.22,1,0.36,1)_both]" : ""}`}
              />
            );
          })}
        </span>
      </div>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-full bg-ink/90 px-3 backdrop-blur-sm transition-opacity duration-500 sm:hidden ${
          showing ? "opacity-100" : "opacity-0"
        }`}
      >
        <span
          key={discovery?.count}
          className={`size-2 shrink-0 rounded-full bg-cyan shadow-[0_0_8px_rgba(93,224,230,0.9)] ${showing ? "animate-[discover-glow_900ms_cubic-bezier(0.22,1,0.36,1)_both]" : ""}`}
        />
        <span className="text-[10px] leading-none font-medium tracking-[0.16em] whitespace-nowrap text-cream uppercase">{text}</span>
      </div>
    </>
  );
}

// On wider screens the open panel covers the top-right HUD, so the announcement
// also appears briefly in the open world to the left of the panel, below the
// menu. Phones show it in the indicator itself, clear of the bottom sheet.
export function DiscoveryToast() {
  const { showing, complete, text } = useDiscoveryAnnouncement();
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute -translate-x-1/2 transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] max-sm:hidden ${
        showing ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
      }`}
      style={{ top: "calc(max(1rem, env(safe-area-inset-top)) + 3.5rem)", left: "calc((100% - min(420px, 100vw - 2rem) - 1rem) / 2)" }}
    >
      <p className="flex items-center gap-2.5 rounded-full bg-ink/55 px-4 py-2 text-[11px] leading-none font-medium tracking-[0.24em] whitespace-nowrap text-cream uppercase backdrop-blur-sm">
        <span className={`size-1.5 rounded-full bg-cyan shadow-[0_0_8px_rgba(93,224,230,0.9)] ${complete ? "motion-safe:animate-pulse" : ""}`} />
        {text}
      </p>
    </div>
  );
}
