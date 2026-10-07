"use client";

import { useWorldStore } from "@/stores/worldStore";

// Sand-coloured cover while Rapier and fonts load, so the world fades in rather
// than popping. Lifts on the first rendered frame; gone without WebGL. It sits
// under the HUD (z-10) so the skip link shows when focused during loading; the
// rest of the HUD stays transparent until the world is ready.
export function LoadVeil() {
  const ready = useWorldStore((s) => s.worldReady || !s.worldAvailable);
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-[9] grid place-items-center bg-[#e9cba5] transition-opacity duration-[1100ms] ease-out ${
        ready ? "opacity-0" : "opacity-100"
      }`}
    >
      <p className={`font-display text-sm tracking-[0.25em] text-rock/70 uppercase transition-opacity duration-500 ${ready ? "opacity-0" : "animate-pulse"}`}>
        Entering the meadow
      </p>
    </div>
  );
}
