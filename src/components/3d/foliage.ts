import * as THREE from "three";
import { PALETTE } from "@/config/world";
import { createRandom } from "@/lib/random";
import type { FoliageTone } from "@/lib/layout";

const TONE_COLOR: Record<FoliageTone, string> = {
  main: PALETTE.foliage,
  light: PALETTE.foliageLight,
  amber: PALETTE.amber,
  coral: PALETTE.coral,
};

// Per-instance foliage colours with a little hue/lightness jitter, optionally
// lifted (`lighten`) for sun-catching top blobs.
export function foliageColors(tones: FoliageTone[], seed: number, lighten = 0) {
  const rng = createRandom(seed);
  return tones.map((tone) =>
    new THREE.Color(TONE_COLOR[tone]).offsetHSL(
      rng.range(-0.015, 0.015),
      rng.range(-0.04, 0.04),
      rng.range(-0.04, 0.04) + lighten,
    ),
  );
}
