"use client";

import { ZONES } from "@/content/zones";
import { useWorldStore } from "@/stores/worldStore";

// One dot per zone; filled cyan once its panel has been opened.
export function VisitedZones() {
  const visited = useWorldStore((s) => s.visited);

  return (
    <div
      role="status"
      aria-label={`Zones discovered: ${visited.length} of ${ZONES.length}`}
      className="flex items-center gap-2 rounded-full bg-ink/55 px-3.5 py-2.5 backdrop-blur-sm"
    >
      {ZONES.map((zone) => {
        const seen = visited.includes(zone.id);
        return (
          <span
            key={zone.id}
            title={seen ? zone.title : "Undiscovered"}
            className={`size-2.5 rounded-full transition duration-500 ${
              seen ? "scale-110 bg-cyan shadow-[0_0_10px_rgba(93,224,230,0.9)]" : "border border-cream/60"
            }`}
          />
        );
      })}
    </div>
  );
}
