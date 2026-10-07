// Worn paths between the plaza and each landmark, as quadratic curves on the
// ground plane (x, z). Used to paint the ground and to keep vegetation off paths.

export type Point = [x: number, z: number];

export type PathCurve = {
  from: Point;
  control: Point;
  to: Point;
  width: number;
};

export const PLAZA_RADIUS = 8.5;

export const PATHS: PathCurve[] = [
  // North to the workshop.
  { from: [0, -8], control: [1.6, -13.5], to: [0, -19.5], width: 2.6 },
  // West to the crystal garden.
  { from: [-8, 0], control: [-14, -1.8], to: [-20, 0], width: 2.6 },
  // East to the milestone gate, then the milestone path itself.
  { from: [8, 0], control: [13.5, 1.6], to: [19, 0.6], width: 2.6 },
  { from: [19, 0.6], control: [26.5, 3], to: [34, -0.4], width: 2.2 },
  // South to the campsite, then on to the lighthouse.
  { from: [0, 8], control: [-0.9, 10.8], to: [0, 13.2], width: 2.4 },
  { from: [0.4, 19.8], control: [2.8, 23.6], to: [1.5, 27.6], width: 2.2 },
  { from: [2.6, 30.6], control: [4.4, 31.2], to: [5.2, 32], width: 1.6 },
];

export function pointOnCurve(c: PathCurve, t: number): Point {
  const u = 1 - t;
  return [
    u * u * c.from[0] + 2 * u * t * c.control[0] + t * t * c.to[0],
    u * u * c.from[1] + 2 * u * t * c.control[1] + t * t * c.to[1],
  ];
}

// Dense samples (about every half unit) for distance queries.
const SAMPLES: { point: Point; halfWidth: number }[] = PATHS.flatMap((c) => {
  const length = Math.hypot(c.to[0] - c.from[0], c.to[1] - c.from[1]);
  const steps = Math.ceil(length * 2);
  return Array.from({ length: steps + 1 }, (_, i) => ({
    point: pointOnCurve(c, i / steps),
    halfWidth: c.width / 2,
  }));
});

// Distance from (x, z) to the nearest path edge; negative means on the path.
export function distanceToPath(x: number, z: number) {
  let best = Infinity;
  for (const s of SAMPLES) {
    const d = Math.hypot(x - s.point[0], z - s.point[1]) - s.halfWidth;
    if (d < best) best = d;
  }
  return best;
}
