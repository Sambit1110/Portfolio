import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import { PALETTE, TONES } from "@/config/world";
import { ZONE_BY_ID } from "@/content/zones";
import { runtime } from "@/stores/runtime";
import { Halo, LightPillar } from "../Effects";
import { createGlow, glow, matte, singleton } from "../materials";

const [X, Z] = ZONE_BY_ID.ai.position;
const coreMaterial = singleton(() => createGlow(PALETTE.cyan, 1));

// The AI assistant as a place: a hexagonal dais with a floating cyan core and
// orbiting rings, plus a console facing the player's approach from the south.
export function AICore() {
  const core = useRef<THREE.Group>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const pillar = useRef<THREE.MeshBasicMaterial>(null);

  // 0..1, eased: how hard the core is "thinking" (an AI request is in flight).
  const thinking = useRef(0);
  // Pulse phase, accumulated so a change of speed never makes it jump.
  const phase = useRef(0);

  useFrame(({ clock }, delta) => {
    const g = runtime.zoneGlow.ai;
    const t = clock.elapsedTime;
    const still = runtime.reducedMotion ? 0 : 1;
    thinking.current = THREE.MathUtils.lerp(thinking.current, runtime.guideThinking ? 1 : 0, Math.min(1, delta * 4));
    const k = thinking.current;
    // Idle it breathes; awake it brightens; thinking it pulses and its rings race.
    phase.current += delta * (1.6 + k * 6);
    const pulse = Math.sin(phase.current) * (0.08 + k * 0.35) * still;
    coreMaterial().emissiveIntensity = 0.7 + g * 1.8 + pulse;
    if (core.current) {
      core.current.position.y = 2.35 + Math.sin(t * 1.4) * 0.12 * still;
      core.current.rotation.y += delta * (0.4 + g * 1.6 + k * 2.5);
      core.current.scale.setScalar(1 + pulse * 0.08);
    }
    if (ringA.current) ringA.current.rotation.z += delta * (0.5 + g + k * 3);
    if (ringB.current) ringB.current.rotation.x += delta * (0.35 + g * 0.8 + k * 2.2);
    if (pillar.current) pillar.current.opacity = 0.06 + g * 0.3 + k * 0.12;
  });

  return (
    <group position={[X, 0, Z]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.6, 1.95]} position={[0, 0.6, 0]} />
      </RigidBody>

      {/* Dais */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow material={matte(PALETTE.rock)}>
        <cylinderGeometry args={[1.85, 2, 0.3, 6]} />
      </mesh>
      <mesh position={[0, 0.34, 0]} receiveShadow material={matte(PALETTE.text)}>
        <cylinderGeometry args={[1.6, 1.7, 0.08, 6]} />
      </mesh>
      <mesh position={[0, 0.39, 0]} rotation-x={-Math.PI / 2} material={coreMaterial()}>
        <ringGeometry args={[1.15, 1.25, 6]} />
      </mesh>

      {/* Pedestal */}
      <mesh position={[0, 0.85, 0]} castShadow material={matte(PALETTE.rock)}>
        <cylinderGeometry args={[0.42, 0.6, 0.95, 6]} />
      </mesh>
      <mesh position={[0, 1.34, 0]} material={matte(PALETTE.text)}>
        <cylinderGeometry args={[0.5, 0.45, 0.08, 6]} />
      </mesh>

      {/* Floating core and its rings */}
      <group ref={core} position={[0, 2.35, 0]}>
        <mesh material={coreMaterial()} castShadow>
          <octahedronGeometry args={[0.52, 0]} />
        </mesh>
        <mesh ref={ringA} rotation-x={Math.PI / 2.4} material={coreMaterial()}>
          <torusGeometry args={[0.95, 0.035, 5, 40]} />
        </mesh>
        <mesh ref={ringB} rotation-y={Math.PI / 3} material={coreMaterial()}>
          <torusGeometry args={[1.18, 0.025, 5, 44]} />
        </mesh>
        <Halo color={PALETTE.cyan} size={3.4} opacity={0.45} additive={false} />
      </group>
      <LightPillar color={PALETTE.cyan} radius={0.55} height={6} position={[0, 0.4, 0]} materialRef={pillar} />

      {/* Console at the south edge of the dais, facing the approach */}
      <group position={[0, 0.38, 1.35]}>
        <mesh position={[0, 0.35, 0]} castShadow material={matte(TONES.ink)}>
          <boxGeometry args={[0.7, 0.7, 0.32]} />
        </mesh>
        <mesh position={[0, 0.78, 0.05]} rotation-x={-0.6} castShadow material={matte(TONES.ink)}>
          <boxGeometry args={[0.85, 0.08, 0.55]} />
        </mesh>
        <mesh position={[0, 0.83, 0.07]} rotation-x={-0.6} material={glow(PALETTE.cyan, 1.2)}>
          <boxGeometry args={[0.66, 0.02, 0.38]} />
        </mesh>
      </group>
    </group>
  );
}
