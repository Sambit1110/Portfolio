"use client";

import { TRAVEL_VEIL_MS, useWorldStore } from "@/stores/worldStore";

// Soft sand-coloured veil that hides the jump during fast travel. Skipped for
// reduced motion: the camera then simply cuts.
export function TravelVeil() {
  const travelling = useWorldStore((s) => s.travelling);
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-[5] bg-[#e9cba5] motion-reduce:hidden ${travelling ? "opacity-100" : "opacity-0"}`}
      style={{ transition: `opacity ${TRAVEL_VEIL_MS}ms ease-in-out` }}
    />
  );
}
