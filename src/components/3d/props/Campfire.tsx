import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import { PALETTE, TONES } from "@/config/world";
import { InstancedPart, composeMatrix } from "../InstancedPart";
import { Halo } from "../Effects";
import { additive, glow, matte } from "../materials";
import { QUALITY_SETTINGS } from "@/config/quality";
import { useDeviceStore } from "@/stores/deviceStore";
import { runtime } from "@/stores/runtime";

const STONES = 9;
const RING_RADIUS = 0.7;
const EMBERS = 8;
const EMBER_LIFE = 1.8;

const emberGeometry = new THREE.OctahedronGeometry(0.035, 0);
const emberMatrix = new THREE.Matrix4();
const emberPosition = new THREE.Vector3();
const emberScale = new THREE.Vector3();
const noRotation = new THREE.Quaternion();

export function Campfire({ position }: { position: [number, number] }) {
  const flame = useRef<THREE.Group>(null);
  const outer = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  const embers = useRef<THREE.InstancedMesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const embersOn = QUALITY_SETTINGS[useDeviceStore((s) => s.quality)].embers;

  const stones = useMemo(
    () => ({
      geometry: new THREE.DodecahedronGeometry(0.2, 0),
      transforms: Array.from({ length: STONES }, (_, i) => {
        const a = (i / STONES) * Math.PI * 2;
        return composeMatrix([Math.cos(a) * RING_RADIUS, 0.1, Math.sin(a) * RING_RADIUS], [a, a * 2, 0], [1, 0.75, 1]);
      }),
    }),
    [],
  );

  // Two flame layers flicker out of step, the light breathes with them, and a
  // few embers drift up and wink out. Reduced motion keeps a steady low fire.
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const still = runtime.reducedMotion;
    const k = still ? 0.25 : 1;
    const f = 1 + (Math.sin(t * 11) * 0.07 + Math.sin(t * 6.7) * 0.05 + Math.sin(t * 17.3) * 0.03) * k;
    flame.current?.scale.set(1, f, 1);
    if (outer.current) {
      outer.current.rotation.y = t * 0.6 * k;
      outer.current.scale.set(1 + Math.sin(t * 9.1) * 0.05 * k, 1, 1 + Math.cos(t * 8.3) * 0.05 * k);
    }
    if (inner.current) {
      inner.current.rotation.y = 0.6 - t * 0.9 * k;
      inner.current.scale.setScalar(1 + Math.sin(t * 13.7 + 1) * 0.08 * k);
    }
    if (light.current) light.current.intensity = 7 * f;

    const e = embers.current;
    if (!e) return;
    e.visible = !still && embersOn;
    if (!e.visible) return;
    for (let i = 0; i < EMBERS; i++) {
      const cycle = t + (i * EMBER_LIFE) / EMBERS;
      const age = (cycle % EMBER_LIFE) / EMBER_LIFE;
      // A fresh launch angle each cycle, so embers don't retrace one path.
      const a = i * 2.4 + Math.floor(cycle / EMBER_LIFE) * 1.7;
      emberPosition.set(
        Math.cos(a) * 0.18 + Math.sin(t * 2 + i) * 0.12 * age,
        0.45 + age * 1.9,
        Math.sin(a) * 0.18 + Math.cos(t * 1.7 + i) * 0.12 * age,
      );
      emberScale.setScalar(Math.sin(Math.PI * age) * (1 - age * 0.4));
      e.setMatrixAt(i, emberMatrix.compose(emberPosition, noRotation, emberScale));
    }
    e.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[position[0], 0, position[1]]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.4, RING_RADIUS + 0.2]} position={[0, 0.4, 0]} />
      </RigidBody>

      <InstancedPart geometry={stones.geometry} material={matte(PALETTE.rock)} transforms={stones.transforms} castShadow />

      {[0, Math.PI / 3, -Math.PI / 3].map((rotation) => (
        <mesh key={rotation} position={[0, 0.12, 0]} rotation={[0, rotation, Math.PI / 2]} castShadow material={matte(TONES.trunk)}>
          <cylinderGeometry args={[0.07, 0.08, 0.9, 6]} />
        </mesh>
      ))}

      <group ref={flame} position={[0, 0.2, 0]}>
        <mesh ref={outer} position={[0, 0.3, 0]} material={glow(PALETTE.amber, 1.6)}>
          <coneGeometry args={[0.28, 0.65, 5]} />
        </mesh>
        <mesh ref={inner} position={[0, 0.25, 0]} rotation={[0, 0.6, 0]} material={glow(PALETTE.lantern, 2)}>
          <coneGeometry args={[0.16, 0.45, 5]} />
        </mesh>
      </group>
      <Halo color={PALETTE.amber} size={4} position={[0, 0.7, 0]} opacity={0.5} />
      <instancedMesh ref={embers} args={[emberGeometry, glow(PALETTE.lantern, 2.4), EMBERS]} frustumCulled={false} />
      {/* Warm pool of firelight on the ground. */}
      <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2} material={additive(PALETTE.amber, 0.25)}>
        <planeGeometry args={[6, 6]} />
      </mesh>
      <pointLight ref={light} position={[0, 0.9, 0]} color={PALETTE.amber} distance={7} decay={1.5} />
    </group>
  );
}
