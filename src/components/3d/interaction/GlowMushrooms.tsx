import { useMemo } from "react";
import * as THREE from "three";
import { PALETTE } from "@/config/world";
import { ZONES } from "@/content/zones";
import { createRandom } from "@/lib/random";
import { distanceToPath } from "@/lib/paths";
import { InstancedPart, composeMatrix } from "../InstancedPart";
import { glow, matte } from "../materials";

// Little cyan-capped mushrooms clustered just outside each interaction ring.
// Cyan = interactive, so these only ever appear around zones.
export function GlowMushrooms() {
  const { stem, cap, transforms } = useMemo(() => {
    const rng = createRandom(77);
    const transforms: THREE.Matrix4[] = [];
    for (const zone of ZONES) {
      for (let i = 0, placed = 0; placed < 7 && i < 60; i++) {
        const a = rng.next() * Math.PI * 2;
        const d = zone.radius + rng.range(0.6, 1.6);
        const x = zone.position[0] + Math.cos(a) * d;
        const z = zone.position[1] + Math.sin(a) * d;
        if (distanceToPath(x, z) < 0.3) continue;
        // The plaza's south half holds the name and spawn; keep it uncluttered.
        if (zone.id === "ai" && z > zone.position[1]) continue;
        placed++;
        // Mushrooms grow in small clumps of one to three.
        for (let k = 0; k < 1 + Math.floor(rng.next() * 3); k++) {
          const s = rng.range(0.6, 1.2);
          transforms.push(
            composeMatrix([x + rng.range(-0.3, 0.3), 0, z + rng.range(-0.3, 0.3)], [rng.range(-0.15, 0.15), 0, rng.range(-0.15, 0.15)], s),
          );
        }
      }
    }
    return {
      stem: new THREE.CylinderGeometry(0.05, 0.07, 0.3, 5).translate(0, 0.15, 0),
      cap: new THREE.SphereGeometry(0.16, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.28, 0),
      transforms,
    };
  }, []);

  return (
    <group>
      <InstancedPart geometry={stem} material={matte(PALETTE.text)} transforms={transforms} />
      <InstancedPart geometry={cap} material={glow(PALETTE.cyan, 1.1)} transforms={transforms} />
    </group>
  );
}
