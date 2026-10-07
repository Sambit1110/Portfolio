import { WORLD } from "@/config/world";

// Ground height. Everything the robot can reach stays perfectly flat (the
// physics floor is flat), so slopes never affect movement. Beyond the walls the
// forest floor rises into a soft wooded bank that frames the meadow like the
// rim of a diorama, then eases back down at the edge of the painted ground.
// The shore side (south) stays at sea level.

const RISE = 1.7;

const smoothstep = (x: number, a: number, b: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

export function terrainHeight(x: number, z: number) {
  // How far into the forest band, measured from the nearest wall (north, east, west).
  const depth = Math.max(Math.abs(x), -z) - WORLD.boundary;
  if (depth <= 1) return 0;
  const bank = smoothstep(depth, 2.5, 15) * (1 - smoothstep(depth, WORLD.groundHalf - WORLD.boundary - 7, WORLD.groundHalf - WORLD.boundary));
  // No bank toward the sea.
  const inland = 1 - smoothstep(z, WORLD.boundary - 6, WORLD.boundary + 1);
  // Gentle undulation so the bank reads as land, not a ramp.
  const roll = 0.8 + 0.2 * Math.sin(x * 0.21 + 1.3) * Math.cos(z * 0.17 - 0.4);
  return RISE * bank * inland * roll;
}
