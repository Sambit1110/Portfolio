import { useMemo } from "react";
import * as THREE from "three";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import { PALETTE } from "@/config/world";
import { createRandom } from "@/lib/random";
import type { ScatterPlacement } from "@/lib/layout";
import { InstancedPart, composeMatrix } from "./InstancedPart";
import { instancedMatte } from "./materials";

type RocksProps = {
  rocks: ScatterPlacement[];
  colliders?: boolean;
};

let geometry: THREE.BufferGeometry | null = null;
const getGeometry = () => (geometry ??= new THREE.DodecahedronGeometry(1, 0));

export function Rocks({ rocks, colliders = false }: RocksProps) {
  const { transforms, colors } = useMemo(() => {
    const rng = createRandom(rocks.length + 101);
    return {
      // Sink each rock a little so it sits in the ground instead of on it.
      transforms: rocks.map((r) =>
        composeMatrix([r.position[0], r.scale[1] * 0.45, r.position[2]], [0, r.rotationY, 0], r.scale),
      ),
      colors: rocks.map(() => new THREE.Color(PALETTE.rock).offsetHSL(0, rng.range(-0.03, 0.03), rng.range(-0.04, 0.06))),
    };
  }, [rocks]);

  if (rocks.length === 0) return null;

  return (
    <group>
      <InstancedPart
        geometry={getGeometry()}
        material={instancedMatte()}
        transforms={transforms}
        colors={colors}
        castShadow
        receiveShadow
      />
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
