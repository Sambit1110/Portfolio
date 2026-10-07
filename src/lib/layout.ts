import { WORLD } from "@/config/world";
import { createRandom, type Random } from "@/lib/random";
import { PLAZA_RADIUS, distanceToPath } from "@/lib/paths";

export type Vec3 = [number, number, number];

export type FoliageTone = "main" | "light" | "amber" | "coral";

export type TreePlacement = {
  position: Vec3;
  rotationY: number;
  scale: number;
  kind: "round" | "tall";
  tone: FoliageTone;
};

export type ScatterPlacement = {
  position: Vec3;
  rotationY: number;
  scale: Vec3;
};

export type TintedPlacement = ScatterPlacement & { tone: FoliageTone };

type Circle = { x: number; z: number; r: number };

// Areas kept free of scattered vegetation: the plaza and each landmark footprint.
export const CLEARINGS: Circle[] = [
  { x: 0, z: 0, r: PLAZA_RADIUS + 1 },
  { x: 0, z: -25, r: 9.5 },
  { x: -25, z: 0, r: 9 },
  { x: 24, z: 0.5, r: 7.5 },
  { x: 30, z: 0.5, r: 6 },
  { x: 0, z: 16.5, r: 6.5 },
  { x: 4, z: 31, r: 7.5 },
];

function inClearing(x: number, z: number, margin = 0) {
  return CLEARINGS.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + margin);
}

function isFree(x: number, z: number, radius: number) {
  return !inClearing(x, z, radius) && distanceToPath(x, z) > radius + 0.4;
}

function insidePlayable(x: number, z: number, margin: number) {
  const b = WORLD.boundary - margin;
  return Math.abs(x) < b && Math.abs(z) < b;
}

// Smooth pseudo-noise used to group tones into groves rather than salt-and-pepper.
function warmth(x: number, z: number) {
  return Math.sin(x * 0.11 + 1.3) + Math.cos(z * 0.09 - 0.7) + Math.sin((x + z) * 0.05);
}

function foliageTone(rng: Random, x: number, z: number): FoliageTone {
  if (warmth(x, z) > 1.35) return rng.next() < 0.6 ? "amber" : "coral";
  return rng.next() < 0.6 ? "main" : "light";
}

function generateLayout() {
  const rng = createRandom(WORLD.seed);
  const occupied: Circle[] = [];

  const trees: TreePlacement[] = [];
  const bushes: TintedPlacement[] = [];
  const rocks: ScatterPlacement[] = [];
  const monoliths: ScatterPlacement[] = [];

  const tryPlace = (x: number, z: number, r: number) => {
    if (!insidePlayable(x, z, r + 0.6) || !isFree(x, z, r)) return false;
    if (occupied.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + r)) return false;
    occupied.push({ x, z, r });
    return true;
  };

  // Framing groves on the four plaza diagonals, between the exits: they frame the
  // open plaza the way dense foliage frames a clearing.
  const framingFields: Circle[] = [];
  for (let q = 0; q < 4; q++) {
    const a = Math.PI / 4 + (q * Math.PI) / 2;
    const cx = Math.cos(a) * (PLAZA_RADIUS + 4.2);
    const cz = Math.sin(a) * (PLAZA_RADIUS + 4.2);
    framingFields.push({ x: cx, z: cz, r: 4.2 });
    for (let i = 0; i < 3; i++) {
      const ta = a + rng.range(-0.35, 0.35);
      const d = PLAZA_RADIUS + rng.range(4, 6.5);
      const x = Math.cos(ta) * d;
      const z = Math.sin(ta) * d;
      const scale = rng.range(1, 1.35);
      if (tryPlace(x, z, 1.2 * scale)) {
        trees.push({ position: [x, 0, z], rotationY: rng.next() * Math.PI * 2, scale, kind: i === 2 ? "tall" : "round", tone: q % 2 ? "main" : "light" });
      }
    }
    for (let i = 0; i < 7; i++) {
      const ta = a + rng.range(-0.5, 0.5);
      const d = PLAZA_RADIUS + rng.range(1.8, 4.5);
      const x = Math.cos(ta) * d;
      const z = Math.sin(ta) * d;
      const s = rng.range(0.55, 0.95);
      if (tryPlace(x, z, 0.8 * s + 0.1)) {
        bushes.push({
          position: [x, 0, z],
          rotationY: rng.next() * Math.PI * 2,
          scale: [s, s * 0.85, s],
          tone: i % 3 === 0 ? (q < 2 ? "amber" : "coral") : "light",
        });
      }
    }
  }

  // Groves: clusters of trees with bushes and rocks gathered around them.
  for (let attempt = 0, groves = 0; groves < 26 && attempt < 600; attempt++) {
    const cx = rng.range(-33, 33);
    const cz = rng.range(-33, 33);
    if (!isFree(cx, cz, 3)) continue;
    groves++;
    const count = 2 + Math.floor(rng.next() * 5);
    for (let i = 0; i < count; i++) {
      const a = rng.next() * Math.PI * 2;
      const d = rng.range(0, 3.6);
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d;
      const scale = rng.range(0.85, 1.3);
      if (tryPlace(x, z, 1.25 * scale)) {
        trees.push({
          position: [x, 0, z],
          rotationY: rng.next() * Math.PI * 2,
          scale,
          kind: rng.next() < 0.3 ? "tall" : "round",
          tone: foliageTone(rng, cx, cz),
        });
      }
    }
    for (let i = 0; i < 2 + rng.next() * 4; i++) {
      const a = rng.next() * Math.PI * 2;
      const d = rng.range(2.2, 5);
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d;
      const s = rng.range(0.55, 0.9);
      if (tryPlace(x, z, 0.8 * s + 0.2)) {
        bushes.push({
          position: [x, 0, z],
          rotationY: rng.next() * Math.PI * 2,
          scale: [s, s * rng.range(0.75, 0.95), s],
          tone: rng.next() < 0.75 ? "light" : foliageTone(rng, x, z),
        });
      }
    }
    if (rng.next() < 0.6) {
      const a = rng.next() * Math.PI * 2;
      const x = cx + Math.cos(a) * 4;
      const z = cz + Math.sin(a) * 4;
      const s = rng.range(0.5, 1);
      if (tryPlace(x, z, s + 0.2)) {
        rocks.push({
          position: [x, 0, z],
          rotationY: rng.next() * Math.PI * 2,
          scale: [s * rng.range(1, 1.4), s * rng.range(0.6, 0.9), s * rng.range(1, 1.4)],
        });
      }
    }
  }

  // Standing stones in the open meadow, as navigation landmarks.
  for (let attempt = 0; monoliths.length < 7 && attempt < 300; attempt++) {
    const x = rng.range(-31, 31);
    const z = rng.range(-31, 31);
    const s = rng.range(0.8, 1.2);
    if (tryPlace(x, z, 1.4 * s)) {
      monoliths.push({
        position: [x, 0, z],
        rotationY: rng.next() * Math.PI * 2,
        scale: [s, s * rng.range(0.9, 1.3), s],
      });
    }
  }

  // Dense forest beyond the north, east and west walls. Unreachable, so no colliders.
  const borderTrees: TreePlacement[] = [];
  const spacing = 3.1;
  for (let x = -WORLD.forestEdge; x <= WORLD.forestEdge; x += spacing) {
    for (let z = -WORLD.forestEdge; z <= WORLD.boundary + 0.5; z += spacing) {
      const px = x + rng.range(-0.45, 0.45) * spacing;
      const pz = z + rng.range(-0.45, 0.45) * spacing;
      const outside = Math.abs(px) > WORLD.boundary + 1.6 || pz < -WORLD.boundary - 1.6;
      if (!outside || rng.next() < 0.08) continue;
      borderTrees.push({
        position: [px, 0, pz],
        rotationY: rng.next() * Math.PI * 2,
        scale: rng.range(1.1, 1.7),
        kind: rng.next() < 0.25 ? "tall" : "round",
        tone: foliageTone(rng, px, pz),
      });
    }
  }

  // Rocks along the shore strip between the south wall and the water.
  for (let x = -WORLD.forestEdge; x <= WORLD.forestEdge; x += rng.range(2.5, 6)) {
    const s = rng.range(0.35, 0.75);
    rocks.push({
      position: [x, 0, WORLD.boundary + rng.range(1, 2.2)],
      rotationY: rng.next() * Math.PI * 2,
      scale: [s * 1.3, s * 0.7, s * 1.2],
    });
  }

  // Grass meadows: soft-edged fields of tufts, kept off paths and the plaza.
  const fieldCentres: Circle[] = [...framingFields];
  for (let attempt = 0; fieldCentres.length < 24 && attempt < 400; attempt++) {
    const x = rng.range(-34, 34);
    const z = rng.range(-34, 34);
    if (inClearing(x, z, -1.5)) continue;
    fieldCentres.push({ x, z, r: rng.range(3, 7) });
  }
  const grass: TintedPlacement[] = [];
  const flowers: TintedPlacement[] = [];
  for (const field of fieldCentres) {
    const tufts = Math.floor(field.r * field.r * 3.6);
    for (let i = 0; i < tufts; i++) {
      const a = rng.next() * Math.PI * 2;
      // An exponent above 0.5 (uniform over the disc) packs tufts toward the
      // centre, so the field thins toward its edge.
      const d = Math.pow(rng.next(), 0.75) * field.r;
      const x = field.x + Math.cos(a) * d;
      const z = field.z + Math.sin(a) * d;
      if (!insidePlayable(x, z, -0.5) || inClearing(x, z, -1) || distanceToPath(x, z) < 0.3) continue;
      const s = rng.range(0.9, 1.6);
      const placement = {
        position: [x, 0, z] as Vec3,
        rotationY: rng.next() * Math.PI * 2,
        scale: [s, s * rng.range(0.8, 1.5), s] as Vec3,
      };
      if (rng.next() < 0.08) {
        flowers.push({ ...placement, scale: [s, s, s], tone: rng.next() < 0.5 ? "coral" : "amber" });
      } else {
        grass.push({ ...placement, tone: rng.next() < 0.85 ? "light" : "main" });
      }
    }
  }

  // Pebbles lining the paths.
  const pebbles: ScatterPlacement[] = [];
  for (let i = 0; pebbles.length < 80 && i < 6000; i++) {
    const x = rng.range(-36, 36);
    const z = rng.range(-36, 36);
    const d = distanceToPath(x, z);
    if (d < 0 || d > 0.8) continue;
    const s = rng.range(0.07, 0.15);
    pebbles.push({
      position: [x, 0, z],
      rotationY: rng.next() * Math.PI * 2,
      scale: [s * 1.3, s * 0.6, s],
    });
  }

  return { trees, borderTrees, bushes, rocks, monoliths, grass, flowers, pebbles };
}

// Computed once at module load; deterministic for a given seed.
export const LAYOUT = generateLayout();

// Split placements into square chunks so each instanced mesh gets a tight bounding
// sphere and off-screen chunks are frustum-culled.
export function chunkByArea<T extends { position: Vec3 }>(items: T[], size: number) {
  const chunks = new Map<string, T[]>();
  for (const item of items) {
    const key = `${Math.floor(item.position[0] / size)}:${Math.floor(item.position[2] / size)}`;
    const list = chunks.get(key);
    if (list) list.push(item);
    else chunks.set(key, [item]);
  }
  return [...chunks.values()];
}
