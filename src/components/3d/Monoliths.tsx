import { useMemo } from "react";
import * as THREE from "three";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import { PALETTE } from "@/config/world";
import { createRandom } from "@/lib/random";
import type { ScatterPlacement } from "@/lib/layout";
import { InstancedPart, composeMatrix } from "./InstancedPart";
import { instancedMatte } from "./materials";

type MonolithsProps = {
  stones: ScatterPlacement[];
  colliders?: boolean;
};

const HEIGHT = 3.4;

// Tall, tapered five-sided stone with a slanted, off-centre top.
function createMonolithGeometry() {
  const geometry = new THREE.CylinderGeometry(0.45, 0.85, HEIGHT, 5, 1);
  const pos = geometry.attributes.position;
  const rng = createRandom(5);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > 0) {
      // Shear the top sideways and slice it at an angle.
      pos.setX(i, pos.getX(i) + 0.18);
      pos.setY(i, y - pos.getX(i) * 0.35 + rng.range(-0.05, 0.05));
    }
  }
  geometry.translate(0, HEIGHT / 2, 0);
  geometry.computeVertexNormals();
  return geometry;
}

let geometry: THREE.BufferGeometry | null = null;
const getGeometry = () => (geometry ??= createMonolithGeometry());

export function Monoliths({ stones, colliders = true }: MonolithsProps) {
  const { transforms, colors } = useMemo(() => {
    const rng = createRandom(stones.length + 303);
    return {
      // Slight random lean so they feel weathered, not manufactured.
      transforms: stones.map((s) =>
        composeMatrix(s.position, [rng.range(-0.08, 0.08), s.rotationY, rng.range(-0.08, 0.08)], s.scale),
      ),
      colors: stones.map(() => new THREE.Color(PALETTE.rock).offsetHSL(0, 0, rng.range(-0.05, 0.03))),
    };
  }, [stones]);

  if (stones.length === 0) return null;

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
          {stones.map((s, i) => (
            <CylinderCollider
              key={i}
              args={[(HEIGHT * s.scale[1]) / 2, 0.8 * s.scale[0]]}
              position={[s.position[0], (HEIGHT * s.scale[1]) / 2, s.position[2]]}
            />
          ))}
        </RigidBody>
      )}
    </group>
  );
}
