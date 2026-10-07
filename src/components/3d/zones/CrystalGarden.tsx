import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import { PALETTE } from "@/config/world";
import { ZONE_BY_ID } from "@/content/zones";
import { runtime } from "@/stores/runtime";
import type { ScatterPlacement } from "@/lib/layout";
import { SKILL_NODES, type SkillNode } from "@/lib/placements";
import { Halo, LightPillar } from "../Effects";
import { Monoliths } from "../Monoliths";
import { matte, singleton } from "../materials";
import { TargetLabel } from "../interaction/TargetLabel";
import { useTargetGlow } from "../interaction/useTargetGlow";
import { ZoneLabel } from "./ZoneLabel";

const [X, Z] = ZONE_BY_ID.skills.position;

// Central cluster: [x, z, height, tilt-x, tilt-z].
const CLUSTER: [number, number, number, number, number][] = [
  [0, 0, 5.2, 0, 0],
  [0.7, 0.35, 3.2, 0.15, -0.35],
  [-0.65, 0.4, 2.7, 0.25, 0.4],
  [0.2, -0.7, 3.3, -0.4, -0.1],
  [-0.45, -0.5, 2, -0.3, 0.35],
];

// Standing stones around the garden, leaving the east side open for the path.
const STONES: ScatterPlacement[] = Array.from({ length: 5 }, (_, i) => {
  const a = 1.05 * (i + 1);
  return {
    position: [X + Math.cos(a) * 7.8, 0, Z + Math.sin(a) * 7.8],
    rotationY: a,
    scale: [0.8, 0.75 + (i % 3) * 0.15, 0.8],
  };
});

// Faceted, semi-glossy cyan that glows brighter as the player approaches.
const crystalMaterial = singleton(
  () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.cyan,
      emissive: PALETTE.cyan,
      emissiveIntensity: 0.4,
      roughness: 0.25,
      flatShading: true,
    }),
);

// Elongated octahedron, base at y = 0, unit height.
const crystalGeometry = singleton(() => {
  const g = new THREE.OctahedronGeometry(0.5, 0);
  g.scale(0.55, 1, 0.55);
  g.translate(0, 0.5, 0);
  return g;
});
const plinthGeometry = singleton(() => new THREE.CylinderGeometry(0.32, 0.4, 0.44, 6));

// One crystal per skill category; taller when the category holds more skills.
const crystalHeight = (node: SkillNode) => 0.55 + node.category.skills.length * 0.09;

function SkillCrystal({ node }: { node: SkillNode }) {
  const glowLevel = useTargetGlow({ kind: "skill", id: node.category.id });
  const crystal = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const height = crystalHeight(node);

  useFrame(({ clock }, delta) => {
    const g = glowLevel.current;
    if (material.current) material.current.emissiveIntensity = 0.35 + runtime.zoneGlow.skills * 0.3 + g * 1.4;
    if (crystal.current) {
      crystal.current.position.y = 0.45 + Math.sin(clock.elapsedTime * 1.2 + node.angle) * 0.05 + g * 0.15;
      // Spins while near; accumulated, so the spin eases in and out smoothly.
      crystal.current.rotation.y += delta * g * 0.8;
    }
  });

  return (
    <group position={[node.position[0], 0, node.position[1]]}>
      <mesh geometry={plinthGeometry()} position-y={0.22} rotation-y={node.angle} material={matte(PALETTE.rock)} castShadow receiveShadow />
      <mesh ref={crystal} geometry={crystalGeometry()} rotation-y={node.angle} scale={[0.9, height, 0.9]} castShadow>
        <meshStandardMaterial
          ref={material}
          color={PALETTE.cyan}
          emissive={PALETTE.cyan}
          emissiveIntensity={0.35}
          roughness={0.25}
          flatShading
        />
      </mesh>
      <TargetLabel text={node.category.name} position={[0, height + 0.9, 0]} glow={glowLevel} size={0.38} />
    </group>
  );
}

export function CrystalGarden() {
  const pillar = useRef<THREE.MeshBasicMaterial>(null);
  const cluster = useRef<THREE.Group>(null);
  // Breath phase, accumulated so it can quicken without jumping.
  const phase = useRef(0);

  // The garden "breathes": crystals and pillar swell softly together, faster and
  // brighter as the player approaches; the cluster turns almost imperceptibly.
  useFrame((_, delta) => {
    const g = runtime.zoneGlow.skills;
    const still = runtime.reducedMotion ? 0 : 1;
    phase.current += delta * (1.2 + g * 0.8);
    const breath = Math.sin(phase.current) * still;
    crystalMaterial().emissiveIntensity = 0.38 + g * 0.9 + breath * 0.08;
    if (pillar.current) pillar.current.opacity = 0.1 + g * 0.25 + breath * 0.025;
    if (cluster.current) cluster.current.rotation.y += delta * 0.04 * still;
  });

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[2.6, 1.3]} position={[X, 2.6, Z]} />
        {SKILL_NODES.map(({ category, position: [x, z] }) => (
          <CylinderCollider key={category.id} args={[0.4, 0.4]} position={[x, 0.4, z]} />
        ))}
      </RigidBody>

      <group position={[X, 0, Z]}>
        <group ref={cluster}>
          {CLUSTER.map(([x, z, h, tx, tz], i) => (
            <mesh
              key={i}
              geometry={crystalGeometry()}
              material={crystalMaterial()}
              position={[x, 0, z]}
              rotation={[tx, i * 0.7, tz]}
              scale={[h * 0.55, h, h * 0.55]}
              castShadow
            />
          ))}
        </group>
        <Halo color={PALETTE.cyan} size={6} position={[0, 3, 0]} opacity={0.3} additive={false} />
        <LightPillar color={PALETTE.cyan} radius={1.3} height={12} materialRef={pillar} />
      </group>

      {/* One crystal node per category in content/skills.ts. */}
      {SKILL_NODES.map((node) => (
        <SkillCrystal key={node.category.id} node={node} />
      ))}

      <Monoliths stones={STONES} />
      <ZoneLabel id="skills" />
    </group>
  );
}
