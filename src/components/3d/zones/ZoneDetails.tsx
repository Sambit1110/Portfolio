import * as THREE from "three";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import { PALETTE, TONES } from "@/config/world";
import { MILESTONES, PEDESTALS } from "@/lib/placements";
import { PATHS, pointOnCurve } from "@/lib/paths";
import { glow, singleton } from "../materials";
import { buildProp, propMaterial, type PropPart } from "../props/build";
import { FIRE, TENT } from "./Camp";
import { TOWER } from "./Lighthouse";
import { SHED } from "./Workshop";

// Hand-placed dressing that tells each landmark's story. Every zone's detail
// is one merged, vertex-coloured mesh (one draw call); props solid enough to
// walk into get small colliders. Built in world coordinates.

type V3 = [number, number, number];
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (top: number, bottom: number, h: number, sides = 8) => new THREE.CylinderGeometry(top, bottom, h, sides);

function DetailMesh({ geometry }: { geometry: () => THREE.BufferGeometry }) {
  return <mesh geometry={geometry()} material={propMaterial()} castShadow receiveShadow />;
}

// ── Projects: the research workshop ────────────────────────────────────────

const [SX, SZ] = SHED;
const FRONT = SZ + 2; // the shed's south wall
const GEAR: V3 = [SX + 2.72, 0.78, SZ + 0.9];
const SPOOL: V3 = [-5.7, 0.42, -27.8];
const PLANKS: V3 = [5.5, 0, -25.2];
const BENCH_LAMP: V3 = [-4.95, 1.42, -25.75];

// A cog in its own space (axis along y): a disc with ten teeth.
const cogShape = () =>
  buildProp([
    { geometry: cyl(0.62, 0.62, 0.12, 14), color: TONES.rockLight },
    ...Array.from({ length: 10 }, (_, i): PropPart => {
      const a = (i / 10) * Math.PI * 2;
      return { geometry: box(0.2, 0.12, 0.2), color: TONES.rockLight, position: [Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7], rotation: [0, -a, 0] };
    }),
  ]);

const workshopGeometry = singleton(() => {
  const parts: PropPart[] = [
    // Stone footing and the roof's ridge beam.
    { geometry: box(5.3, 0.22, 4.3), color: TONES.rockLight, position: [SX, 0.11, SZ], shade: 0.75 },
    { geometry: box(0.16, 0.16, 4.8), color: TONES.woodDark, position: [SX, 2.6 + 1.9, SZ] },
    // Door frame and lintel.
    { geometry: box(0.1, 2.02, 0.08), color: TONES.woodDark, position: [SX - 0.6, 1.01, FRONT + 0.04] },
    { geometry: box(0.1, 2.02, 0.08), color: TONES.woodDark, position: [SX + 0.6, 1.01, FRONT + 0.04] },
    { geometry: box(1.34, 0.12, 0.09), color: TONES.woodDark, position: [SX, 2.02, FRONT + 0.04] },
    // Window sills and mullions.
    ...[-1.6, 1.6].flatMap((x): PropPart[] => [
      { geometry: box(0.98, 0.08, 0.14), color: TONES.woodDark, position: [SX + x, 1.08, FRONT + 0.06] },
      { geometry: box(0.05, 0.66, 0.04), color: TONES.woodDark, position: [SX + x, 1.45, FRONT + 0.03] },
      { geometry: box(0.82, 0.05, 0.04), color: TONES.woodDark, position: [SX + x, 1.45, FRONT + 0.03] },
    ]),
    // Vent pipe on the roof.
    { geometry: cyl(0.11, 0.11, 0.9, 7), color: TONES.ink, position: [SX + 1.3, 3.55, SZ - 0.6] },
    { geometry: cyl(0.2, 0.2, 0.06, 7), color: TONES.ink, position: [SX + 1.3, 4.02, SZ - 0.6] },
    // A big cog leaning against the east wall: this is where things get built.
    { geometry: cogShape(), color: TONES.rockLight, position: GEAR, rotation: [0, 0, Math.PI / 2 - 0.25] },
    { geometry: cyl(0.2, 0.2, 0.18, 10), color: PALETTE.amber, position: GEAR, rotation: [0, 0, Math.PI / 2 - 0.25] },
    // Cable spool on its side.
    { geometry: cyl(0.26, 0.26, 0.5, 10), color: PALETTE.coral, position: SPOOL, rotation: [0, 0, Math.PI / 2] },
    { geometry: cyl(0.42, 0.42, 0.06, 12), color: TONES.wood, position: [SPOOL[0] - 0.27, SPOOL[1], SPOOL[2]], rotation: [0, 0, Math.PI / 2] },
    { geometry: cyl(0.42, 0.42, 0.06, 12), color: TONES.wood, position: [SPOOL[0] + 0.27, SPOOL[1], SPOOL[2]], rotation: [0, 0, Math.PI / 2] },
    // A stack of planks by the crates.
    ...[0, 1, 2].map((i): PropPart => ({ geometry: box(1.7, 0.08, 0.3), color: i % 2 ? TONES.wood : TONES.woodDark, position: [PLANKS[0], 0.04 + i * 0.08, PLANKS[2] + (i - 1) * 0.08], rotation: [0, i * 0.08, 0] })),
    // Blueprints and a lamp on the workbench.
    { geometry: box(0.72, 0.01, 0.5), color: PALETTE.text, position: [-3.55, 0.865, -25.55], rotation: [0, 0.12, 0], shade: 1 },
    { geometry: box(0.5, 0.012, 0.02), color: PALETTE.rock, position: [-3.55, 0.872, -25.55], rotation: [0, 0.12, 0], shade: 1 },
    { geometry: cyl(0.03, 0.03, 0.6, 5), color: TONES.ink, position: [-4.95, 1.15, -25.85] },
    { geometry: cyl(0.03, 0.12, 0.12, 7), color: TONES.ink, position: [BENCH_LAMP[0], BENCH_LAMP[1] + 0.06, BENCH_LAMP[2]] },
    // A stone plinth under every pedestal.
    ...PEDESTALS.map(({ position: [x, z] }): PropPart => ({ geometry: cyl(0.78, 0.82, 0.05, 8), color: TONES.pathDark, position: [x, 0.025, z], shade: 0.9 })),
  ];
  return buildProp(parts);
});

export function WorkshopDetails() {
  return (
    <group>
      <DetailMesh geometry={workshopGeometry} />
      <mesh position={BENCH_LAMP} material={glow(PALETTE.lantern, 1.6)}>
        <sphereGeometry args={[0.07, 8, 6]} />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.2, 0.8, 0.7]} position={GEAR} />
        <CylinderCollider args={[0.45, 0.45]} position={[SPOOL[0], 0.45, SPOOL[2]]} />
        <CuboidCollider args={[0.85, 0.15, 0.25]} position={[PLANKS[0], 0.15, PLANKS[2]]} />
      </RigidBody>
    </group>
  );
}

// ── About: the campsite ────────────────────────────────────────────────────

const [FX, FZ] = FIRE;
const WOODPILE: V3 = [TENT[0] - 2.55, 0, TENT[1] - 0.4];
const BEDROLL: V3 = [TENT[0] + 0.95, 0.17, TENT[1] + 2.05];
const STUMP: V3 = [FX + 1.25, 0.2, FZ + 1.25];

const campGeometry = singleton(() => {
  const parts: PropPart[] = [
    // A cooking tripod over the fire with a pot hanging from it.
    ...[0, 1, 2].map((i): PropPart => {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      return { geometry: cyl(0.025, 0.035, 1.55, 5), color: TONES.woodDark, position: [FX + Math.cos(a) * 0.4, 0.68, FZ + Math.sin(a) * 0.4], rotation: [Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45] };
    }),
    { geometry: cyl(0.01, 0.01, 0.4, 4), color: TONES.ink, position: [FX, 1.18, FZ] },
    { geometry: new THREE.SphereGeometry(0.17, 8, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), color: TONES.ink, position: [FX, 1.0, FZ] },
    { geometry: cyl(0.17, 0.17, 0.04, 8), color: TONES.rockLight, position: [FX, 1.0, FZ] },
    // Firewood stacked beside the tent.
    ...[0, 1, 2, 3, 4].map((i): PropPart => ({
      geometry: cyl(0.11, 0.12, 1.1, 6),
      color: i % 2 ? TONES.trunk : TONES.wood,
      position: [WOODPILE[0] + (i < 3 ? (i - 1) * 0.24 : (i - 3.5) * 0.24), i < 3 ? 0.12 : 0.33, WOODPILE[2]],
      rotation: [Math.PI / 2, 0, 0],
    })),
    // A rolled bedroll at the tent's door, and a stump to sit on.
    { geometry: cyl(0.17, 0.17, 1.05, 10), color: PALETTE.coral, position: BEDROLL, rotation: [0, 0, Math.PI / 2] },
    { geometry: cyl(0.175, 0.175, 0.22, 10), color: PALETTE.text, position: [BEDROLL[0] - 0.3, BEDROLL[1], BEDROLL[2]], rotation: [0, 0, Math.PI / 2] },
    { geometry: cyl(0.3, 0.34, 0.4, 9), color: TONES.wood, position: STUMP, shade: 0.7 },
    { geometry: cyl(0.27, 0.27, 0.02, 9), color: TONES.groundLight, position: [STUMP[0], 0.41, STUMP[2]], shade: 1 },
  ];
  return buildProp(parts);
});

export function CampDetails() {
  return (
    <group>
      <DetailMesh geometry={campGeometry} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.45, 0.3, 0.6]} position={[WOODPILE[0], 0.3, WOODPILE[2]]} />
        <CuboidCollider args={[0.55, 0.2, 0.2]} position={BEDROLL} />
        <CylinderCollider args={[0.2, 0.34]} position={STUMP} />
      </RigidBody>
    </group>
  );
}

// ── Contact: the lighthouse ────────────────────────────────────────────────

const [TX, TZ] = TOWER;
const TOWER_TOP = 6 * 1.35;
// The tower's radius at a height (it tapers band by band).
const towerRadius = (y: number) => 1.5 - Math.floor(y / 1.35) * 0.08 - ((y % 1.35) / 1.35) * 0.11;

const lighthouseGeometry = singleton(() => {
  const parts: PropPart[] = [
    // Stone base the tower rises from.
    { geometry: cyl(1.62, 1.78, 0.32, 10), color: TONES.rockLight, position: [TX, 0.16, TZ], shade: 0.7 },
    // Gallery deck and railing around the lamp room.
    { geometry: cyl(1.62, 1.55, 0.1, 12), color: PALETTE.rock, position: [TX, TOWER_TOP - 0.02, TZ] },
    { geometry: new THREE.TorusGeometry(1.56, 0.035, 4, 24), color: TONES.ink, position: [TX, TOWER_TOP + 0.48, TZ], rotation: [Math.PI / 2, 0, 0] },
    ...Array.from({ length: 12 }, (_, i): PropPart => {
      const a = (i / 12) * Math.PI * 2;
      return { geometry: box(0.04, 0.48, 0.04), color: TONES.ink, position: [TX + Math.cos(a) * 1.56, TOWER_TOP + 0.24, TZ + Math.sin(a) * 1.56] };
    }),
    // A door and windows facing the shore path.
    { geometry: box(0.62, 1.15, 0.1), color: TONES.ink, position: [TX, 0.88, TZ + towerRadius(0.9) - 0.01] },
    { geometry: box(0.78, 0.1, 0.14), color: TONES.woodDark, position: [TX, 1.5, TZ + towerRadius(1.5)] },
    ...[3.0, 5.4, 7.3].flatMap((y): PropPart[] => [
      { geometry: box(0.26, 0.4, 0.08), color: TONES.ink, position: [TX, y, TZ + towerRadius(y) - 0.01] },
      { geometry: box(0.36, 0.06, 0.12), color: PALETTE.text, position: [TX, y - 0.23, TZ + towerRadius(y)] },
    ]),
  ];
  return buildProp(parts);
});

export function LighthouseDetails() {
  return <DetailMesh geometry={lighthouseGeometry} />;
}

// ── Experience: the milestone path ─────────────────────────────────────────

const MILESTONE_CURVE = PATHS[3];

// A point beside the milestone path: `side` units to its south (+) or north (−).
function besidePath(t: number, side: number): [number, number] {
  const [x, z] = pointOnCurve(MILESTONE_CURVE, t);
  const [x2, z2] = pointOnCurve(MILESTONE_CURVE, Math.min(t + 0.01, 1));
  const len = Math.hypot(x2 - x, z2 - z) || 1;
  return [x - ((z2 - z) / len) * side, z + ((x2 - x) / len) * side];
}

// Set back from the path's edge (half-width 1.1), so the walkway stays clear.
const CAIRNS = [besidePath(0.06, 1.7), besidePath(0.39, 1.7), besidePath(0.73, 1.7), besidePath(0.98, -1.6)];
const SIGNPOST: V3 = [17.4, 0, 3.7];
const PATH_END = besidePath(1, 0);

const milestoneGeometry = singleton(() => {
  const parts: PropPart[] = [
    // Stone cairns marking the way, each a little stack of flattened stones.
    ...CAIRNS.flatMap(([x, z], c): PropPart[] =>
      [0.34, 0.26, 0.18].map((r, i) => ({
        geometry: new THREE.DodecahedronGeometry(r, 0),
        color: i % 2 ? TONES.rockLight : PALETTE.rock,
        position: [x + (i ? (c % 2 ? 0.04 : -0.04) : 0), 0.14 + i * 0.26, z],
        rotation: [0, c + i, 0],
        scale: [1, 0.6, 1],
      })),
    ),
    // A signpost at the gate.
    { geometry: box(0.12, 1.7, 0.12), color: TONES.woodDark, position: [SIGNPOST[0], 0.85, SIGNPOST[2]] },
    { geometry: box(1.0, 0.24, 0.06), color: PALETTE.text, position: [SIGNPOST[0] + 0.32, 1.42, SIGNPOST[2]], rotation: [0, -0.15, 0] },
    { geometry: box(0.82, 0.2, 0.06), color: PALETTE.amber, position: [SIGNPOST[0] + 0.25, 1.1, SIGNPOST[2]], rotation: [0, 0.2, 0] },
    // A pennant where the path runs on beyond the world.
    { geometry: cyl(0.035, 0.045, 1.8, 5), color: TONES.woodDark, position: [PATH_END[0] + 0.6, 0.9, PATH_END[1] - 0.8] },
    { geometry: new THREE.ConeGeometry(0.18, 0.6, 3), color: PALETTE.coral, position: [PATH_END[0] + 0.9, 1.6, PATH_END[1] - 0.8], rotation: [0, 0, -Math.PI / 2] },
    // A stone plinth under every milestone.
    ...MILESTONES.map(({ position: [x, z] }): PropPart => ({ geometry: cyl(0.55, 0.6, 0.05, 8), color: TONES.pathDark, position: [x, 0.025, z], shade: 0.9 })),
  ];
  return buildProp(parts);
});

export function MilestoneDetails() {
  return (
    <group>
      <DetailMesh geometry={milestoneGeometry} />
      <RigidBody type="fixed" colliders={false}>
        {CAIRNS.map(([x, z]) => (
          <CylinderCollider key={x} args={[0.4, 0.36]} position={[x, 0.4, z]} />
        ))}
        <CylinderCollider args={[0.85, 0.12]} position={[SIGNPOST[0], 0.85, SIGNPOST[2]]} />
      </RigidBody>
    </group>
  );
}
