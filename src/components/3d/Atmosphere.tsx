import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PALETTE } from "@/config/world";
import { createRandom } from "@/lib/random";
import { getGlowTexture } from "@/lib/textures";
import { QUALITY_SETTINGS } from "@/config/quality";
import { useDeviceStore } from "@/stores/deviceStore";
import { runtime } from "@/stores/runtime";
import { glow, halo, singleton } from "./materials";

const MOTES = 90;
// Box of air around the camera focus that the motes drift through (x, y, z).
const VOLUME = [32, 5, 24] as const;

// Wraps v into [-size/2, size/2) so motes recycle around the moving focus.
const wrap = (v: number, size: number) => ((((v + size / 2) % size) + size) % size) - size / 2;

// Module-level: the world has exactly one atmosphere.
const motes = singleton(() => {
  const rng = createRandom(91);
  const seeds = Array.from({ length: MOTES }, () => ({
    x: rng.range(-VOLUME[0] / 2, VOLUME[0] / 2),
    y: rng.range(0.4, VOLUME[1]),
    z: rng.range(-VOLUME[2] / 2, VOLUME[2] / 2),
    // Slow drift with the breeze, plus a personal bob.
    vx: rng.range(0.15, 0.4),
    vz: rng.range(-0.1, 0.1),
    phase: rng.next() * Math.PI * 2,
  }));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3));
  return { geometry, seeds };
});

// Golden-hour dust motes plus a candle-like flicker on every lantern. One
// points draw call; positions update on the CPU (a few hundred floats).
export function Atmosphere() {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);
  const count = QUALITY_SETTINGS[useDeviceStore((s) => s.quality)].motes;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    // Lantern glass and halos flicker together, softly.
    const flicker = 1 + (Math.sin(t * 7.1) * 0.5 + Math.sin(t * 12.7) * 0.3 + Math.sin(t * 3.3) * 0.2) * 0.05 * (runtime.reducedMotion ? 0 : 1);
    glow(PALETTE.lantern, 1.6).emissiveIntensity = 1.6 * flicker;
    halo(PALETTE.lantern, 0.5).opacity = 0.5 * flicker;

    const p = points.current;
    const m = material.current;
    if (!p || !m) return;
    // Hidden for reduced motion and in the vista, where they'd be specks of noise.
    const visible = count > 0 && !runtime.reducedMotion && runtime.camera.ratio < 1.4;
    m.opacity = THREE.MathUtils.lerp(m.opacity, visible ? 0.65 : 0, 0.05);
    p.visible = m.opacity > 0.01;
    if (!p.visible) return;

    const { geometry, seeds } = motes();
    geometry.setDrawRange(0, count);
    const { x: fx, z: fz } = runtime.camera.focus;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    seeds.forEach((s, i) => {
      pos.setXYZ(
        i,
        fx + wrap(s.x + s.vx * t - fx, VOLUME[0]),
        s.y + Math.sin(t * 0.6 + s.phase) * 0.25,
        fz + wrap(s.z + s.vz * t + Math.cos(t * 0.4 + s.phase) * 0.3 - fz, VOLUME[2]),
      );
    });
    pos.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={motes().geometry} frustumCulled={false}>
      <pointsMaterial
        ref={material}
        color="#FFF1D6"
        map={getGlowTexture()}
        size={0.26}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}
