import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import { PALETTE, TONES } from "@/config/world";
import { ZONE_BY_ID } from "@/content/zones";
import { getGlowTexture } from "@/lib/textures";
import { runtime } from "@/stores/runtime";
import { Halo, LightPillar } from "../Effects";
import { InstancedPart, composeMatrix } from "../InstancedPart";
import { createGlow, glow, matte, singleton } from "../materials";
import { buildProp, propMaterial } from "../props/build";

const [X, Z] = ZONE_BY_ID.ai.position;
const coreMaterial = singleton(() => createGlow(PALETTE.cyan, 1));

const HEX = Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2 + Math.PI / 6);
// Pylons on the hex corners, leaving the south (where visitors approach) open.
const PYLON_RADIUS = 2.2;
const PYLONS = HEX.filter((a) => Math.abs(a - Math.PI / 2) > 0.1);

// A low stone apron and pylons at the corners: the plaza's centrepiece. The
// apron is only a few centimetres high, as the walkable floor is flat.
const baseGeometry = singleton(() =>
  buildProp([
    { geometry: new THREE.CylinderGeometry(2.45, 2.55, 0.05, 6), color: TONES.rockLight, position: [0, 0.025, 0], shade: 0.9 },
    ...PYLONS.map((a) => ({
      geometry: new THREE.CylinderGeometry(0.09, 0.15, 0.95, 5),
      color: PALETTE.rock,
      position: [Math.cos(a) * PYLON_RADIUS, 0.47, Math.sin(a) * PYLON_RADIUS] as [number, number, number],
      shade: 0.65,
    })),
  ]),
);
const pylonTips = PYLONS.map((a) => composeMatrix([Math.cos(a) * PYLON_RADIUS, 1.02, Math.sin(a) * PYLON_RADIUS], [0, a, 0], 1));
const tipGeometry = singleton(() => new THREE.OctahedronGeometry(0.11, 0).scale(1, 1.6, 1));

// Six shards orbiting the core in one mesh.
const shardGeometry = singleton(() => {
  const shards = HEX.map((a, i) => {
    const g = new THREE.OctahedronGeometry(0.13, 0).scale(0.7, 1.7, 0.7);
    g.rotateZ(0.3).translate(Math.cos(a) * 1.5, (i % 2 ? 0.18 : -0.12), Math.sin(a) * 1.5);
    return g;
  });
  const merged = new THREE.BufferGeometry();
  const positions = shards.flatMap((g) => Array.from(g.attributes.position.array as Float32Array));
  merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  merged.computeVertexNormals();
  return merged;
});

// Energy rings that ripple out across the plaza floor.
const RIPPLES = 2;
const rippleGeometry = singleton(() => new THREE.RingGeometry(0.96, 1, 64).rotateX(-Math.PI / 2));

// Data motes rising off the dais; more and faster while the guide thinks.
const MOTES = 26;
const moteGeometry = singleton(() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3));
  return g;
});
const moteSeeds = Array.from({ length: MOTES }, (_, i) => ({ a: i * 2.399, r: 0.4 + ((i * 37) % 11) / 11, speed: 0.35 + ((i * 53) % 7) / 14 }));

// The AI assistant as a place: a hexagonal dais with a floating cyan core and
// orbiting rings, plus a console facing the player's approach from the south.
export function AICore() {
  const core = useRef<THREE.Group>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const pillar = useRef<THREE.MeshBasicMaterial>(null);

  const shards = useRef<THREE.Mesh>(null);
  const ripples = useRef<(THREE.Mesh | null)[]>([]);
  const motes = useRef<THREE.Points>(null);
  const moteMaterial = useRef<THREE.PointsMaterial>(null);
  const flow = useRef({ ripple: 0, rise: 0 });

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

    // Shards orbit the core, quickening as it wakes and thinks.
    if (shards.current) {
      shards.current.rotation.y -= delta * (0.25 + g * 0.5 + k * 1.8) * still;
      shards.current.position.y = 2.35 + Math.sin(t * 1.1) * 0.1 * still;
    }

    // Ripples: a slow pulse at rest, a quick one while thinking.
    const f = flow.current;
    f.ripple = (f.ripple + delta * (0.22 + g * 0.15 + k * 0.6) * still) % 1;
    ripples.current.forEach((ring, i) => {
      if (!ring) return;
      const p = (f.ripple + i / RIPPLES) % 1;
      ring.scale.setScalar(2.2 + p * 3.4);
      (ring.material as THREE.MeshBasicMaterial).opacity = (1 - p) * (0.12 + g * 0.2 + k * 0.35) * (still ? 1 : 0.6);
    });

    // Motes drift up through the pillar.
    f.rise += delta * (0.6 + k * 2.2) * still;
    const pos = moteGeometry().attributes.position as THREE.BufferAttribute;
    moteSeeds.forEach((m, i) => {
      const h = (f.rise * m.speed + i / MOTES) % 1;
      const a = m.a + f.rise * 0.3;
      pos.setXYZ(i, Math.cos(a) * m.r * (1 - h * 0.5), 0.5 + h * 4.5, Math.sin(a) * m.r * (1 - h * 0.5));
    });
    pos.needsUpdate = true;
    if (moteMaterial.current) moteMaterial.current.opacity = (0.35 + g * 0.3 + k * 0.35) * (still ? 1 : 0.5);
  });

  return (
    <group position={[X, 0, Z]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.6, 1.95]} position={[0, 0.6, 0]} />
        {PYLONS.map((a) => (
          <CylinderCollider key={a} args={[0.5, 0.16]} position={[Math.cos(a) * PYLON_RADIUS, 0.5, Math.sin(a) * PYLON_RADIUS]} />
        ))}
      </RigidBody>

      {/* Stepped base, corner pylons and their cyan tips */}
      <mesh geometry={baseGeometry()} material={propMaterial()} castShadow receiveShadow />
      <InstancedPart geometry={tipGeometry()} material={coreMaterial()} transforms={pylonTips} />
      {/* Cyan light pooled on the plaza around the core */}
      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2} renderOrder={1}>
        <planeGeometry args={[7.5, 7.5]} />
        <meshBasicMaterial color={PALETTE.cyan} map={getGlowTexture()} transparent opacity={0.22} depthWrite={false} toneMapped={false} />
      </mesh>
      {Array.from({ length: RIPPLES }, (_, i) => (
        <mesh key={i} ref={(m) => { ripples.current[i] = m; }} geometry={rippleGeometry()} position={[0, 0.03, 0]} renderOrder={1}>
          <meshBasicMaterial color={PALETTE.cyan} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}

      {/* Dais */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow material={matte(PALETTE.rock)}>
        <cylinderGeometry args={[1.85, 2, 0.3, 6]} />
      </mesh>
      {/* Dark slate top, so the cyan core and its light read cleanly against it. */}
      <mesh position={[0, 0.34, 0]} receiveShadow material={matte(TONES.rockLight)}>
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
      <mesh ref={shards} geometry={shardGeometry()} material={coreMaterial()} position={[0, 2.35, 0]} />
      <points ref={motes} geometry={moteGeometry()} frustumCulled={false}>
        <pointsMaterial
          ref={moteMaterial}
          color={PALETTE.cyan}
          map={getGlowTexture()}
          size={0.16}
          sizeAttenuation
          transparent
          opacity={0.4}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
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
