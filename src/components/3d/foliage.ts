import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PALETTE, TONES } from "@/config/world";
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

// Deterministic 0..1 hash of a ground position: per-plant variation (stretch,
// lean, species) without touching the layout's random sequence.
export function hash2(x: number, z: number, salt = 0) {
  const s = Math.sin(x * 127.1 + z * 311.7 + salt * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

// ── Painted plant geometry ─────────────────────────────────────────────────
// Each plant is one merged mesh. Vertex colours carry painted light and shade
// (darker underneath, lighter on top), multiplied in the shader by the
// instance's foliage colour; bark vertices (aBark = 1) keep their own colour.

type Piece = { geometry: THREE.BufferGeometry; bark: boolean };

// Shades a piece's vertices from `low` at its bottom to `high` at its top.
function paint(geometry: THREE.BufferGeometry, base: THREE.Color, low: number, high: number, bark: boolean): Piece {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.computeBoundingBox();
  const { min, max } = g.boundingBox!;
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const barkMask = new Float32Array(pos.count).fill(bark ? 1 : 0);
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - min.y) / Math.max(max.y - min.y, 1e-6);
    const k = low + (high - low) * t;
    colors[i * 3] = base.r * k;
    colors[i * 3 + 1] = base.g * k;
    colors[i * 3 + 2] = base.b * k;
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.setAttribute("aBark", new THREE.BufferAttribute(barkMask, 1));
  return { geometry: g, bark };
}

// A faceted canopy blob: an icosahedron with its corners nudged in and out and
// its underside flattened, so canopies look sculpted rather than spherical.
function canopyBlob(radius: number, detail: number, seed: number) {
  const g = new THREE.IcosahedronGeometry(radius, detail);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Same corner, same nudge: faces stay closed.
    const n = 0.88 + hash2(Math.round(x * 100), Math.round(z * 100), seed + Math.round(y * 100)) * 0.24;
    pos.setXYZ(i, x * n, y < -radius * 0.35 ? -radius * 0.35 + (y + radius * 0.35) * 0.45 : y * n, z * n);
  }
  return g;
}

const transformed = (g: THREE.BufferGeometry, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]) =>
  g.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale),
    ),
  );

const WHITE = new THREE.Color(1, 1, 1);
const trunkColor = () => new THREE.Color(TONES.trunk);

function merge(pieces: Piece[]) {
  // Keep only the attributes every piece has, so they merge cleanly.
  for (const { geometry } of pieces) {
    for (const name of Object.keys(geometry.attributes)) {
      if (!["position", "normal", "color", "aBark"].includes(name)) geometry.deleteAttribute(name);
    }
  }
  const merged = mergeGeometries(pieces.map((p) => p.geometry))!;
  pieces.forEach((p) => p.geometry.dispose());
  merged.computeBoundingSphere();
  return merged;
}

const trunk = (bottom: number, top: number, height: number) =>
  paint(transformed(new THREE.CylinderGeometry(top, bottom, height, 6), [0, height / 2, 0]), trunkColor(), 0.7, 1.05, true);

const blob = (r: number, detail: number, seed: number, at: [number, number, number], rot: [number, number, number], squash = 0.9, low = 0.72, high = 1.12) =>
  paint(transformed(canopyBlob(r, detail, seed), at, rot, [1, squash, 1]), WHITE, low, high, false);

// Broad, rounded canopy of overlapping blobs.
export function roundTreeGeometry() {
  return merge([
    trunk(0.24, 0.15, 1.35),
    blob(1.08, 1, 1, [0, 2, 0], [0, 0, 0]),
    blob(0.72, 0, 2, [0.72, 1.68, 0.26], [0.3, 0.5, 0], 0.85, 0.7, 1.05),
    blob(0.64, 0, 3, [-0.58, 1.84, -0.4], [0.6, 0.2, 0], 0.85, 0.7, 1.05),
    blob(0.56, 0, 4, [0.12, 2.82, 0.08], [0.2, 0.9, 0], 0.9, 0.95, 1.2),
  ]);
}

// Taller, columnar tree of stacked blobs.
export function tallTreeGeometry() {
  return merge([
    trunk(0.2, 0.13, 1.65),
    blob(0.86, 1, 5, [0, 1.9, 0], [0, 0, 0], 0.92, 0.72, 1.06),
    blob(0.7, 1, 6, [0.04, 2.8, -0.02], [0, 0.6, 0], 0.92, 0.82, 1.12),
    blob(0.48, 0, 7, [-0.02, 3.55, 0.03], [0.4, 0, 0.3], 0.95, 0.95, 1.22),
  ]);
}

// A stylised pine: three tiers of seven-sided cones, slightly offset, so the
// forest gains a pointed silhouette among the rounded crowns.
export function pineTreeGeometry() {
  const tier = (r: number, h: number, y: number, twist: number, low: number, high: number) =>
    paint(transformed(new THREE.ConeGeometry(r, h, 7, 1), [0, y, 0], [0, twist, 0]), WHITE, low, high, false);
  return merge([
    trunk(0.17, 0.11, 1.3),
    tier(1.02, 1.45, 1.55, 0, 0.66, 0.98),
    tier(0.8, 1.25, 2.3, 0.45, 0.76, 1.06),
    tier(0.54, 1.05, 3.0, 0.9, 0.88, 1.18),
  ]);
}

// Three overlapping blobs read as a soft bush from above.
export function bushGeometry() {
  return merge([
    blob(0.8, 1, 11, [0, 0.5, 0], [0, 0, 0], 0.88, 0.7, 1.1),
    blob(0.55, 0, 12, [0.55, 0.36, 0.2], [0.5, 0.8, 0], 0.85, 0.68, 1.02),
    blob(0.45, 0, 13, [-0.3, 0.74, -0.15], [0.2, 0.3, 0], 0.9, 0.9, 1.18),
  ]);
}
