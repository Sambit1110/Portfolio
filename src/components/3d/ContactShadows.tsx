import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { WORLD } from "@/config/world";
import { ZONE_BY_ID } from "@/content/zones";
import { LAYOUT } from "@/lib/layout";
import { MILESTONES, PEDESTALS, SKILL_NODES } from "@/lib/placements";
import { getGlowTexture } from "@/lib/textures";
import { runtime } from "@/stores/runtime";
import { InstancedPart, composeMatrix } from "./InstancedPart";
import { singleton } from "./materials";
import { FIRE, TENT } from "./zones/Camp";
import { STONES } from "./zones/CrystalGarden";
import { TOWER } from "./zones/Lighthouse";
import { LANTERNS } from "./zones/Plaza";
import { SHED } from "./zones/Workshop";

// Soft violet blobs where things meet the ground: the darkening a sun shadow
// alone doesn't give, so trees, rocks and props sit on the meadow rather than
// on top of it. Unlit, depth-write-free decals: one draw call for the world.
const material = singleton(
  () =>
    new THREE.MeshBasicMaterial({
      color: "#3a2c4c",
      map: getGlowTexture(),
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
);
const geometry = singleton(() => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));

const inside = (x: number, z: number) => Math.abs(x) < WORLD.boundary + 3 && z > -WORLD.boundary - 3;

// [x, z, diameter]
function contactSpots(): [number, number, number][] {
  const spots: [number, number, number][] = [];
  for (const t of LAYOUT.trees) spots.push([t.position[0], t.position[2], (t.kind === "round" ? 2.6 : 2.1) * t.scale]);
  for (const t of LAYOUT.borderTrees) if (inside(t.position[0], t.position[2])) spots.push([t.position[0], t.position[2], 2.4 * t.scale]);
  for (const b of LAYOUT.bushes) spots.push([b.position[0], b.position[2], 2 * b.scale[0]]);
  for (const r of LAYOUT.rocks) spots.push([r.position[0], r.position[2], 2.6 * Math.max(r.scale[0], r.scale[2])]);
  for (const m of [...LAYOUT.monoliths, ...STONES]) spots.push([m.position[0], m.position[2], 2.4 * m.scale[0]]);
  for (const p of PEDESTALS) spots.push([p.position[0], p.position[1], 1.9]);
  for (const n of SKILL_NODES) spots.push([n.position[0], n.position[1], 1.4]);
  for (const m of MILESTONES) spots.push([m.position[0], m.position[1], 1.3]);
  for (const [x, z] of LANTERNS) spots.push([x, z, 0.9]);
  const ai = ZONE_BY_ID.ai.position;
  const skills = ZONE_BY_ID.skills.position;
  spots.push([ai[0], ai[1], 5.6], [skills[0], skills[1], 3.6], [SHED[0], SHED[1], 7.5], [TENT[0], TENT[1], 4.2], [FIRE[0], FIRE[1], 2.4], [TOWER[0], TOWER[1], 4.6]);
  return spots;
}

// The robot's own soft shadow, which follows it everywhere.
function RobotContact() {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const p = runtime.player.position;
    mesh.current?.position.set(p.x, 0.014, p.z);
  });
  return <mesh ref={mesh} geometry={geometry()} material={material()} scale={[1.5, 1, 1.5]} renderOrder={1} />;
}

export function ContactShadows() {
  const transforms = useMemo(() => contactSpots().map(([x, z, d]) => composeMatrix([x, 0.012, z], [0, 0, 0], [d, 1, d])), []);
  return (
    <>
      <InstancedPart geometry={geometry()} material={material()} transforms={transforms} />
      <RobotContact />
    </>
  );
}
