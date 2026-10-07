import type { Quality } from "@/stores/deviceStore";

// Per-tier rendering settings. "high" is the approved desktop look; touch
// devices start lower and the performance monitor moves between tiers.
type QualitySettings = {
  dpr: [number, number];
  shadowMap: number;
  // Shadow edge softness, in shadow-map texels.
  shadowSoftness: number;
  motes: number;
  embers: boolean;
  // Fireflies and crystal sparkles.
  sparkles: number;
  grassStride: number;
  borderDepth: number;
  // Screen-space glow on bright emissive surfaces (desktop). Lower tiers keep
  // the halo sprites, so glowing things still read as glowing.
  bloom: boolean;
};

export const QUALITY_SETTINGS: Record<Quality, QualitySettings> = {
  high: { dpr: [1, 1.75], shadowMap: 2048, shadowSoftness: 3, motes: 90, embers: true, sparkles: 48, grassStride: 1, borderDepth: Infinity, bloom: true },
  medium: { dpr: [1, 1.5], shadowMap: 1536, shadowSoftness: 2.5, motes: 60, embers: true, sparkles: 32, grassStride: 1, borderDepth: Infinity, bloom: false },
  // Shadows stay on; only the cheapest-to-lose detail goes.
  low: { dpr: [1, 1], shadowMap: 1024, shadowSoftness: 2, motes: 0, embers: false, sparkles: 0, grassStride: 2, borderDepth: 12, bloom: false },
};

const ORDER: Quality[] = ["low", "medium", "high"];

// Touch devices never climb above "medium".
export function stepQuality(current: Quality, direction: 1 | -1): Quality {
  const index = Math.min(Math.max(ORDER.indexOf(current) + direction, 0), ORDER.indexOf("medium"));
  return ORDER[index];
}
