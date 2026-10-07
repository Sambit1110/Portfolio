import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PALETTE } from "@/config/world";
import type { Zone } from "@/content/zones";
import { getGlowTexture } from "@/lib/textures";
import { zoneOf } from "@/lib/interactables";
import { useWorldStore } from "@/stores/worldStore";
import { runtime } from "@/stores/runtime";

const DASHES = 18;
// How far outside the ring the "approaching" glow starts.
const APPROACH = 6;

// Ring of short arcs, for the slowly turning outer "scanner" ring.
function createDashedRing(radius: number) {
  const step = (Math.PI * 2) / DASHES;
  const arcs = Array.from({ length: DASHES }, (_, i) =>
    new THREE.RingGeometry(radius, radius + 0.08, 4, 1, i * step, step * 0.55),
  );
  const merged = mergeGeometries(arcs);
  arcs.forEach((a) => a.dispose());
  return merged;
}

// Unlit, translucent and depth-write-free, so the marker never hides anything.
// Normal (not additive) blending keeps cyan from washing out on bright sand.
const CYAN_DECAL = {
  color: PALETTE.cyan,
  transparent: true,
  depthWrite: false,
  toneMapped: false,
  fog: false,
} as const;

// Cyan ground marker for an interactive zone. Idle it is barely there; it wakes
// as the player enters and is brightest while the zone's panel is open. Its glow
// level is shared through runtime.zoneGlow so the landmark can respond too.
export function InteractionMarker({ zone }: { zone: Zone }) {
  const dashes = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const outerMat = useRef<THREE.MeshBasicMaterial>(null);
  const discMat = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useRef(0);

  const geometries = useMemo(() => {
    const r = zone.radius;
    return {
      ring: new THREE.RingGeometry(r - 0.12, r, 72),
      outer: createDashedRing(r + 0.35),
      disc: new THREE.CircleGeometry(r, 48),
    };
  }, [zone.radius]);

  useFrame(({ clock }, delta) => {
    // Idle → approaching (a few units out) → near (inside) → active (open).
    // "Near" covers the ring itself or any target inside it.
    const { nearby, active } = useWorldStore.getState();
    const { x, z } = runtime.player.position;
    const distance = Math.hypot(x - zone.position[0], z - zone.position[1]);
    // three's smoothstep is (x, min, max): 1 at the ring's edge, 0 APPROACH units out.
    const approach = 1 - THREE.MathUtils.smoothstep(distance, zone.radius, zone.radius + APPROACH);
    const isActive = zoneOf(active) === zone.id;
    const target = isActive ? 1 : zoneOf(nearby) === zone.id ? 0.8 : 0.15 + approach * 0.25;
    glow.current = THREE.MathUtils.lerp(glow.current, target, 1 - Math.exp(-6 * Math.min(delta, 0.1)));
    const g = glow.current;
    runtime.zoneGlow[zone.id] = g;

    const pulse = 0.85 + Math.sin(clock.elapsedTime * 3) * 0.15;
    if (ringMat.current) ringMat.current.opacity = (0.25 + g * 0.65) * pulse;
    if (outerMat.current) outerMat.current.opacity = 0.12 + g * 0.5;
    if (discMat.current) discMat.current.opacity = 0.04 + g * 0.22;
    if (dashes.current) {
      dashes.current.rotation.z += delta * (0.08 + g * 0.6);
      // Active: a slow, restrained breath outward rather than a flashing ring.
      dashes.current.scale.setScalar(isActive ? 1 + Math.sin(clock.elapsedTime * 1.6) * 0.02 : 1);
    }
  });

  return (
    <group position={[zone.position[0], 0.025, zone.position[1]]} rotation-x={-Math.PI / 2}>
      <mesh geometry={geometries.disc}>
        <meshBasicMaterial ref={discMat} {...CYAN_DECAL} map={getGlowTexture()} opacity={0.04} />
      </mesh>
      <mesh geometry={geometries.ring}>
        <meshBasicMaterial ref={ringMat} {...CYAN_DECAL} opacity={0.3} />
      </mesh>
      <mesh ref={dashes} geometry={geometries.outer}>
        <meshBasicMaterial ref={outerMat} {...CYAN_DECAL} opacity={0.12} />
      </mesh>
    </group>
  );
}
