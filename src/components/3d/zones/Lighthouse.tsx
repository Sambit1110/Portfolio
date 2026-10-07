import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import { PALETTE, TONES } from "@/config/world";
import { ZONE_BY_ID } from "@/content/zones";
import { runtime } from "@/stores/runtime";
import { getBeamTexture } from "@/lib/textures";
import { Halo } from "../Effects";
import { createAdditive, createGlow, glow, halo, matte, singleton } from "../materials";
import { ZoneLabel } from "./ZoneLabel";

export const TOWER: [number, number] = [6.8, 33.4];
const BANDS = 6;
const BAND_HEIGHT = 1.35;
// Long enough to sweep across the plaza ~29 units away.
const BEAM_LENGTH = 34;
const [MX, MZ] = ZONE_BY_ID.contact.position;
const MAILBOX: [number, number] = [MX + 1, MZ - 0.4];

const beamMaterial = singleton(() => {
  const m = createAdditive(PALETTE.lantern, 0.16, getBeamTexture());
  m.side = THREE.DoubleSide;
  return m;
});
// The lamp's second, fainter beam on the far side.
const backBeamMaterial = singleton(() => {
  const m = createAdditive(PALETTE.lantern, 0.07, getBeamTexture());
  m.side = THREE.DoubleSide;
  return m;
});
const slot = singleton(() => createGlow(PALETTE.cyan, 0.8));

// Contact: a striped lighthouse at the edge of the sea with a sweeping beam, a
// mailbox for "send a signal", and a short pier out into the water.
export function Lighthouse() {
  const beam = useRef<THREE.Group>(null);

  // The lantern flares each time the beam swings toward the viewer (south):
  // a signal sent your way.
  useFrame((_, delta) => {
    if (beam.current) {
      beam.current.rotation.y += delta * 0.4;
      const facing = Math.max(0, -Math.sin(beam.current.rotation.y));
      const flare = runtime.reducedMotion ? 0 : facing ** 6;
      glow(PALETTE.lantern, 1.8).emissiveIntensity = 1.8 + flare * 1.6;
      halo(PALETTE.lantern, 0.6).opacity = 0.6 + flare * 0.35;
    }
    slot().emissiveIntensity = 0.5 + runtime.zoneGlow.contact * 1.6;
  });

  const top = BANDS * BAND_HEIGHT;

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[top / 2, 1.5]} position={[TOWER[0], top / 2, TOWER[1]]} />
        <CuboidCollider args={[0.3, 0.6, 0.3]} position={[MAILBOX[0], 0.6, MAILBOX[1]]} />
      </RigidBody>

      <group position={[TOWER[0], 0, TOWER[1]]}>
        {/* Rocky footing */}
        {[
          [-1.3, 0.6, 1.1],
          [1.2, -0.9, 0.9],
          [0.4, 1.4, 0.7],
        ].map(([x, z, s], i) => (
          <mesh key={i} position={[x, s * 0.3, z]} scale={[s * 1.3, s * 0.7, s]} rotation-y={i} castShadow material={matte(PALETTE.rock)}>
            <dodecahedronGeometry args={[1, 0]} />
          </mesh>
        ))}

        {/* Tower: alternating cream and coral bands, tapering upward */}
        {Array.from({ length: BANDS }, (_, i) => {
          const r0 = 1.5 - i * 0.08;
          return (
            <mesh key={i} position={[0, BAND_HEIGHT * (i + 0.5), 0]} castShadow receiveShadow material={matte(i % 2 ? PALETTE.coral : PALETTE.text)}>
              <cylinderGeometry args={[r0 - 0.11, r0, BAND_HEIGHT, 10]} />
            </mesh>
          );
        })}
        <mesh position={[0, top + 0.08, 0]} castShadow material={matte(TONES.ink)}>
          <cylinderGeometry args={[1.35, 1.35, 0.16, 10]} />
        </mesh>
        <mesh position={[0, top + 0.6, 0]} material={glow(PALETTE.lantern, 1.8)}>
          <cylinderGeometry args={[0.6, 0.6, 0.9, 8]} />
        </mesh>
        <mesh position={[0, top + 1.45, 0]} castShadow material={matte(PALETTE.coral)}>
          <coneGeometry args={[0.85, 0.8, 10]} />
        </mesh>
        <Halo color={PALETTE.lantern} size={5} position={[0, top + 0.6, 0]} opacity={0.6} />

        {/* Sweeping beam: a long cone, bright at the lamp, fading outward. */}
        <group ref={beam} position={[0, top + 0.6, 0]}>
          <mesh position={[BEAM_LENGTH / 2, 0, 0]} rotation-z={Math.PI / 2} material={beamMaterial()}>
            <coneGeometry args={[4.5, BEAM_LENGTH, 20, 1, true]} />
          </mesh>
          <mesh position={[-BEAM_LENGTH * 0.35, 0, 0]} rotation-z={-Math.PI / 2} material={backBeamMaterial()}>
            <coneGeometry args={[3.2, BEAM_LENGTH * 0.7, 16, 1, true]} />
          </mesh>
        </group>
      </group>

      {/* Pier into the sea (beyond the wall, purely scenic) */}
      <group position={[TOWER[0] + 3, 0, TOWER[1] + 2]}>
        <mesh position={[0, 0.25, 3]} castShadow receiveShadow material={matte(TONES.wood)}>
          <boxGeometry args={[1.4, 0.12, 7]} />
        </mesh>
        {[0.6, 3, 5.6].flatMap((z) =>
          [-0.6, 0.6].map((x) => (
            <mesh key={`${x}:${z}`} position={[x, 0.1, z]} material={matte(TONES.woodDark)}>
              <cylinderGeometry args={[0.09, 0.09, 0.5, 5]} />
            </mesh>
          )),
        )}
      </group>

      {/* Mailbox with a glowing cyan slot */}
      <group position={[MAILBOX[0], 0, MAILBOX[1]]}>
        <mesh position={[0, 0.5, 0]} castShadow material={matte(TONES.woodDark)}>
          <boxGeometry args={[0.12, 1, 0.12]} />
        </mesh>
        <mesh position={[0, 1.15, 0]} castShadow material={matte(PALETTE.coral)}>
          <boxGeometry args={[0.55, 0.42, 0.75]} />
        </mesh>
        <mesh position={[0, 1.15, 0.38]} material={slot()}>
          <boxGeometry args={[0.3, 0.05, 0.02]} />
        </mesh>
        <mesh position={[0.3, 1.35, -0.1]} material={matte(PALETTE.amber)}>
          <boxGeometry args={[0.04, 0.35, 0.22]} />
        </mesh>
      </group>

      <ZoneLabel id="contact" />
    </group>
  );
}
