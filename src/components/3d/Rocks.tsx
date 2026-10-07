import { useMemo } from "react";
import * as THREE from "three";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import { PALETTE } from "@/config/world";
import { createRandom } from "@/lib/random";
import type { ScatterPlacement } from "@/lib/layout";
import { InstancedPart, composeMatrix } from "./InstancedPart";
import { hash2 } from "./foliage";
import { instancedMatte, singleton } from "./materials";

type RocksProps = {
  rocks: ScatterPlacement[];
  colliders?: boolean;
};

// Corners nudged in and out (the same nudge for a shared corner, so faces stay
// closed): weathered stone rather than a perfect solid.
function weathered(geometry: THREE.BufferGeometry, seed: number, amount: number) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = 1 + (hash2(Math.round(x * 97), Math.round(z * 97), seed + Math.round(y * 97)) - 0.5) * amount;
    pos.setXYZ(i, x * n, y * n, z * n);
  }
  g.computeVertexNormals();
  return g;
}

// Three silhouettes: a rounded boulder, a squat faceted stone and a flat slab.
const VARIANTS = [
  singleton(() => weathered(new THREE.DodecahedronGeometry(1, 0), 1, 0.3)),
  singleton(() => weathered(new THREE.IcosahedronGeometry(1, 0), 2, 0.35).scale(1.1, 0.8, 1)),
  singleton(() => weathered(new THREE.DodecahedronGeometry(1, 0), 3, 0.22).scale(1.25, 0.55, 0.95)),
];

export function Rocks({ rocks, colliders = false }: RocksProps) {
  const variants = useMemo(() => {
    const rng = createRandom(rocks.length + 101);
    const buckets = VARIANTS.map(() => ({ transforms: [] as THREE.Matrix4[], colors: [] as THREE.Color[] }));
    for (const r of rocks) {
      const bucket = buckets[Math.floor(hash2(r.position[0], r.position[2], 5) * VARIANTS.length)];
      // Sink each rock a little so it sits in the ground instead of on it.
      bucket.transforms.push(composeMatrix([r.position[0], r.scale[1] * 0.45, r.position[2]], [0, r.rotationY, 0], r.scale));
      bucket.colors.push(new THREE.Color(PALETTE.rock).offsetHSL(0, rng.range(-0.03, 0.03), rng.range(-0.04, 0.06)));
    }
    return buckets;
  }, [rocks]);

  if (rocks.length === 0) return null;

  return (
    <group>
      {variants.map(({ transforms, colors }, i) =>
        transforms.length === 0 ? null : (
          <InstancedPart
            key={i}
            geometry={VARIANTS[i]()}
            material={instancedMatte()}
            transforms={transforms}
            colors={colors}
            castShadow
            receiveShadow
          />
        ),
      )}
      {colliders && (
        <RigidBody type="fixed" colliders={false}>
          {rocks.map((r, i) => (
            <CylinderCollider
              key={i}
              args={[r.scale[1] * 1.45, Math.max(r.scale[0], r.scale[2]) * 0.85]}
              position={[r.position[0], 0, r.position[2]]}
            />
          ))}
        </RigidBody>
      )}
    </group>
  );
}
