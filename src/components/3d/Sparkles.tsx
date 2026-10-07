import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PALETTE } from "@/config/world";
import { QUALITY_SETTINGS } from "@/config/quality";
import { ZONE_BY_ID } from "@/content/zones";
import { getGlowTexture } from "@/lib/textures";
import { useDeviceStore } from "@/stores/deviceStore";
import { runtime } from "@/stores/runtime";
import { hash2 } from "./foliage";
import { singleton } from "./materials";
import { FIRE } from "./zones/Camp";
import { TOWER } from "./zones/Lighthouse";

// Where the little lights gather: warm fireflies by the campfire and along the
// shore below the lighthouse, cyan sparkles drifting in the crystal garden.
const SWARMS = [
  { centre: FIRE, radius: 5.5, color: PALETTE.lantern, share: 0.45, height: [0.5, 2.4] },
  { centre: ZONE_BY_ID.skills.position, radius: 4.5, color: PALETTE.cyan, share: 0.35, height: [0.6, 3.4] },
  { centre: [TOWER[0] - 4, TOWER[1] - 2] as [number, number], radius: 6, color: PALETTE.lantern, share: 0.2, height: [0.4, 2] },
] as const;
const MAX = QUALITY_SETTINGS.high.sparkles;

// Module-level: the world has exactly one set of swarms.
const swarms = singleton(() => {
  const seeds: { x: number; y: number; z: number; phase: number; speed: number }[] = [];
  const base: THREE.Color[] = [];
  SWARMS.forEach((swarm, s) => {
    const n = Math.round(MAX * swarm.share);
    for (let i = 0; i < n; i++) {
      const a = hash2(i, s, 1) * Math.PI * 2;
      const r = Math.sqrt(hash2(i, s, 2)) * swarm.radius;
      seeds.push({
        x: swarm.centre[0] + Math.cos(a) * r,
        y: swarm.height[0] + hash2(i, s, 3) * (swarm.height[1] - swarm.height[0]),
        z: swarm.centre[1] + Math.sin(a) * r,
        phase: hash2(i, s, 4) * Math.PI * 2,
        speed: 0.4 + hash2(i, s, 5) * 0.6,
      });
      base.push(new THREE.Color(swarm.color));
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(seeds.length * 3), 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(seeds.length * 3), 3));
  return { geometry, seeds, base };
});

// Sparse, slow, softly blinking points: one draw call. They rest for reduced
// motion and in the vista, where they'd only be specks.
export function Sparkles() {
  const count = QUALITY_SETTINGS[useDeviceStore((s) => s.quality)].sparkles;
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);


  useFrame(({ clock }) => {
    const { geometry, seeds, base } = swarms();
    const p = points.current;
    const m = material.current;
    if (!p || !m) return;
    const visible = count > 0 && !runtime.reducedMotion && runtime.camera.ratio < 1.4;
    m.opacity = THREE.MathUtils.lerp(m.opacity, visible ? 0.9 : 0, 0.05);
    p.visible = m.opacity > 0.01;
    if (!p.visible) return;
    // Lower tiers draw fewer, dropping the shore swarm first.
    geometry.setDrawRange(0, Math.round(seeds.length * Math.min(count / MAX, 1)));
    const t = clock.elapsedTime;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const col = geometry.attributes.color as THREE.BufferAttribute;
    seeds.forEach((s, i) => {
      const w = t * s.speed + s.phase;
      pos.setXYZ(i, s.x + Math.sin(w * 0.7) * 0.6, s.y + Math.sin(w * 0.9) * 0.3, s.z + Math.cos(w * 0.6) * 0.6);
      // A slow blink: bright for a moment, then barely there.
      const blink = Math.pow(Math.max(0, Math.sin(w * 1.3)), 3) * 0.9 + 0.1;
      col.setXYZ(i, base[i].r * blink * 1.6, base[i].g * blink * 1.6, base[i].b * blink * 1.6);
    });
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={swarms().geometry} frustumCulled={false}>
      <pointsMaterial
        ref={material}
        vertexColors
        map={getGlowTexture()}
        size={0.22}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
