import type { Quality } from "@/stores/deviceStore";

// Per-tier rendering settings. "high" is the approved desktop look; touch
// devices start lower and the performance monitor moves between tiers.
export const QUALITY_SETTINGS: Record<Quality, { dpr: [number, number]; shadowMap: number; motes: number; embers: boolean; grassStride: number; borderDepth: number }> = {
  high: { dpr: [1, 1.75], shadowMap: 2048, motes: 90, embers: true, grassStride: 1, borderDepth: Infinity },
  medium: { dpr: [1, 1.5], shadowMap: 1536, motes: 60, embers: true, grassStride: 1, borderDepth: Infinity },
  // Shadows stay on; only the cheapest-to-lose detail goes.
  low: { dpr: [1, 1], shadowMap: 1024, motes: 0, embers: false, grassStride: 2, borderDepth: 12 },
};

const ORDER: Quality[] = ["low", "medium", "high"];

// Touch devices never climb above "medium".
export function stepQuality(current: Quality, direction: 1 | -1): Quality {
  const index = Math.min(Math.max(ORDER.indexOf(current) + direction, 0), ORDER.indexOf("medium"));
  return ORDER[index];
}
