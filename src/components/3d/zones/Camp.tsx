import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import { PALETTE, TONES } from "@/config/world";
import { ZONE_BY_ID } from "@/content/zones";
import { runtime } from "@/stores/runtime";
import { createGlow, matte, singleton } from "../materials";
import { Campfire } from "../props/Campfire";
import { Lantern } from "../props/Lantern";
import { Smoke } from "../props/Smoke";
import { ZoneLabel } from "./ZoneLabel";

const [X, Z] = ZONE_BY_ID.about.position;
export const TENT: [number, number] = [X - 2.6, Z - 0.9];
export const FIRE: [number, number] = [X + 1.1, Z + 0.4];
// A cyan tag on the pack marks this camp as interactive.
const tag = singleton(() => createGlow(PALETTE.cyan, 0.8));

// A small campsite: tent, fire, log seats, pack and pennant.
export function Camp() {
  const doorway = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.45, 0);
    s.lineTo(0.45, 0);
    s.lineTo(0, 1.1);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, []);
  useFrame(() => {
    tag().emissiveIntensity = 0.5 + runtime.zoneGlow.about * 1.6;
  });

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[1, 1.35]} position={[TENT[0], 1, TENT[1]]} />
        <CylinderCollider args={[0.25, 0.9]} position={[FIRE[0] + 1.3, 0.25, FIRE[1] - 0.2]} />
        <CylinderCollider args={[0.25, 0.9]} position={[FIRE[0] - 0.3, 0.25, FIRE[1] - 1.35]} />
      </RigidBody>

      {/* Tent: four-sided pyramid with a dark doorway facing the camera */}
      <group position={[TENT[0], 0, TENT[1]]}>
        <mesh position={[0, 1.1, 0]} rotation-y={Math.PI / 4} castShadow receiveShadow material={matte(PALETTE.coral)}>
          <coneGeometry args={[1.75, 2.2, 4]} />
        </mesh>
        <mesh geometry={doorway} position={[0, 0.01, 1.25]} rotation-x={-0.5} material={matte(TONES.ink)} />
        <mesh position={[0, 2.25, 0]} material={matte(TONES.woodDark)}>
          <cylinderGeometry args={[0.04, 0.04, 0.4, 5]} />
        </mesh>
      </group>

      <Campfire position={FIRE} />
      <Smoke position={FIRE} />

      {/* Log seats */}
      <mesh position={[FIRE[0] + 1.3, 0.25, FIRE[1] - 0.2]} rotation={[0, 0.3, Math.PI / 2]} castShadow material={matte(TONES.trunk)}>
        <cylinderGeometry args={[0.24, 0.26, 1.5, 7]} />
      </mesh>
      <mesh position={[FIRE[0] - 0.3, 0.25, FIRE[1] - 1.35]} rotation={[0, 1.6, Math.PI / 2]} castShadow material={matte(TONES.trunk)}>
        <cylinderGeometry args={[0.24, 0.26, 1.5, 7]} />
      </mesh>

      {/* Backpack with its cyan tag */}
      <group position={[TENT[0] + 1.75, 0, TENT[1] + 0.9]} rotation-y={-0.5}>
        <mesh position={[0, 0.32, 0]} castShadow material={matte(PALETTE.amber)}>
          <boxGeometry args={[0.5, 0.64, 0.32]} />
        </mesh>
        <mesh position={[0, 0.66, 0]} castShadow material={matte(TONES.woodDark)}>
          <boxGeometry args={[0.52, 0.12, 0.34]} />
        </mesh>
        <mesh position={[0, 0.4, 0.17]} material={tag()}>
          <boxGeometry args={[0.16, 0.1, 0.02]} />
        </mesh>
      </group>

      {/* Pennant */}
      <group position={[X + 3.4, 0, Z - 1.8]}>
        <mesh position={[0, 1.4, 0]} castShadow material={matte(TONES.woodDark)}>
          <cylinderGeometry args={[0.04, 0.05, 2.8, 5]} />
        </mesh>
        <mesh position={[0.35, 2.5, 0]} rotation-y={-0.3} castShadow material={matte(PALETTE.amber)}>
          <coneGeometry args={[0.22, 0.7, 3]} />
        </mesh>
      </group>

      <Lantern position={[X - 3.8, Z + 1.6]} height={1.8} />
      <ZoneLabel id="about" offset={[-0.5, 0]} />
    </group>
  );
}
