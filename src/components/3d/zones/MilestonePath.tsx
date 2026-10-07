import { useRef } from "react";
import type * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import { PALETTE, TONES } from "@/config/world";
import { CERTIFICATE_FRAMES, MILESTONES, type CertificateFrame, type Milestone } from "@/lib/placements";
import { runtime } from "@/stores/runtime";
import { Halo } from "../Effects";
import { createGlow, matte, singleton } from "../materials";
import { TargetLabel } from "../interaction/TargetLabel";
import { useTargetGlow } from "../interaction/useTargetGlow";
import { ZoneLabel } from "./ZoneLabel";

const GATE_X = 18.6;
const PILLAR_HEIGHT = 5.6;
const GATE_POSTS: [number, number][] = [
  [GATE_X, -1.5],
  [GATE_X, 2.7],
];
const RIBBONS = [PALETTE.amber, PALETTE.coral];
// One material per band height, shared by both pillars, so a pulse can travel
// up the bands in sequence.
const BAND_HEIGHTS = [3.9, 4.45, 5];
const bandMaterials = singleton(() => BAND_HEIGHTS.map(() => createGlow(PALETTE.cyan, 0.8)));

// A milestone stone: one per experience or education entry. Education stones
// wear a cream cap so the two kinds read apart.
function MilestoneStone({ milestone }: { milestone: Milestone }) {
  const glowLevel = useTargetGlow({ kind: "milestone", id: milestone.id });
  const band = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    if (band.current) band.current.emissiveIntensity = 0.45 + runtime.zoneGlow.experience * 0.6 + glowLevel.current * 1.6;
  });

  const [x, z] = milestone.position;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.75, 0]} rotation-y={Math.PI / 4} castShadow material={matte(PALETTE.rock)}>
        <cylinderGeometry args={[0.18, 0.34, 1.5, 4]} />
      </mesh>
      <mesh position={[0, 1.02, 0]} rotation-y={Math.PI / 4}>
        <cylinderGeometry args={[0.25, 0.27, 0.09, 4]} />
        <meshStandardMaterial ref={band} color={PALETTE.cyan} emissive={PALETTE.cyan} emissiveIntensity={0.45} />
      </mesh>
      {milestone.type === "education" && (
        <mesh position={[0, 1.58, 0]} rotation-y={Math.PI / 4} castShadow material={matte(PALETTE.text)}>
          <coneGeometry args={[0.22, 0.18, 4]} />
        </mesh>
      )}
      <TargetLabel text={milestone.item.shortTitle} position={[0, 2.1, 0]} glow={glowLevel} size={0.38} />
    </group>
  );
}

// A framed banner on posts. Blank frames hold space until certificates exist;
// a frame with a certificate lights a cyan edge and can be opened.
function Frame({ frame, index }: { frame: CertificateFrame; index: number }) {
  const [x, z] = frame.position;
  return (
    <group position={[x, 0, z]}>
      {[-0.75, 0.75].map((px) => (
        <mesh key={px} position={[px, 1.2, 0]} castShadow material={matte(TONES.woodDark)}>
          <boxGeometry args={[0.12, 2.4, 0.12]} />
        </mesh>
      ))}
      <mesh position={[0, 2.35, 0]} castShadow material={matte(TONES.woodDark)}>
        <boxGeometry args={[1.8, 0.12, 0.14]} />
      </mesh>
      <mesh position={[0, 1.45, 0.02]} castShadow material={matte(PALETTE.text)}>
        <boxGeometry args={[1.25, 1.3, 0.06]} />
      </mesh>
      <mesh position={[0, 1.45, 0.06]} material={matte(PALETTE.path)}>
        <planeGeometry args={[1, 1.05]} />
      </mesh>
      <mesh position={[0, 2.05, 0.06]} material={matte(RIBBONS[index % RIBBONS.length])}>
        <boxGeometry args={[1.35, 0.22, 0.04]} />
      </mesh>
      {frame.certificate && <CertificateGlow id={frame.certificate.id} name={frame.certificate.name} />}
    </group>
  );
}

function CertificateGlow({ id, name }: { id: string; name: string }) {
  const glowLevel = useTargetGlow({ kind: "certificate", id });
  const edge = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    if (edge.current) edge.current.emissiveIntensity = 0.5 + glowLevel.current * 1.6;
  });
  return (
    <>
      <mesh position={[0, 0.78, 0.06]}>
        <boxGeometry args={[1.25, 0.05, 0.04]} />
        <meshStandardMaterial ref={edge} color={PALETTE.cyan} emissive={PALETTE.cyan} emissiveIntensity={0.5} />
      </mesh>
      <TargetLabel text={name} position={[0, 2.75, 0]} glow={glowLevel} size={0.34} />
    </>
  );
}

export function MilestonePath() {
  // Pulse position, accumulated so it can speed up without jumping.
  const climb = useRef(0);

  // A pulse climbs the bands bottom to top: the path leads onward and upward.
  useFrame((_, delta) => {
    const g = runtime.zoneGlow.experience;
    const still = runtime.reducedMotion ? 0 : 1;
    climb.current = (climb.current + delta * (0.45 + g * 0.3)) % 1;
    bandMaterials().forEach((material, i) => {
      const p = (((climb.current - i * 0.12) % 1) + 1) % 1;
      material.emissiveIntensity = 0.5 + g * 1.4 + Math.exp(-(((p - 0.5) * 9) ** 2)) * 1.1 * still;
    });
  });

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {GATE_POSTS.map(([x, z]) => (
          <CylinderCollider key={z} args={[PILLAR_HEIGHT / 2, 0.55]} position={[x, PILLAR_HEIGHT / 2, z]} />
        ))}
        {MILESTONES.map(({ id, position: [x, z] }) => (
          <CylinderCollider key={id} args={[0.75, 0.35]} position={[x, 0.75, z]} />
        ))}
        {CERTIFICATE_FRAMES.map(({ position: [x, z] }) => (
          <CuboidCollider key={x} args={[0.85, 1.2, 0.15]} position={[x, 1.2, z]} />
        ))}
      </RigidBody>

      {/* Entrance: two tall milestone pillars flanking the path, banded in cyan
          near the top so they read from across the world. (A lintel gate would
          read as a wall here, seen edge-on by the north-facing camera.) */}
      {GATE_POSTS.map(([x, z]) => (
        <group key={z} position={[x, 0, z]}>
          <mesh position={[0, PILLAR_HEIGHT / 2, 0]} rotation-y={Math.PI / 4} castShadow receiveShadow material={matte(PALETTE.rock)}>
            <cylinderGeometry args={[0.3, 0.55, PILLAR_HEIGHT, 4]} />
          </mesh>
          <mesh position={[0, PILLAR_HEIGHT + 0.25, 0]} rotation-y={Math.PI / 4} castShadow material={matte(PALETTE.rock)}>
            <coneGeometry args={[0.42, 0.5, 4]} />
          </mesh>
          {BAND_HEIGHTS.map((y, i) => (
            <mesh key={y} position={[0, y, 0]} rotation-y={Math.PI / 4} material={bandMaterials()[i]}>
              <cylinderGeometry args={[0.36, 0.38, 0.1, 4]} />
            </mesh>
          ))}
          <Halo color={PALETTE.cyan} size={2} position={[0, 4.45, 0]} opacity={0.35} additive={false} />
        </group>
      ))}

      {/* One milestone per entry in content/experience.ts and content/education.ts. */}
      {MILESTONES.map((milestone) => (
        <MilestoneStone key={milestone.id} milestone={milestone} />
      ))}

      {/* One frame per certificate in content/certificates.ts (blank frames while empty). */}
      {CERTIFICATE_FRAMES.map((frame, i) => (
        <Frame key={i} frame={frame} index={i} />
      ))}

      <ZoneLabel id="experience" />
    </group>
  );
}
