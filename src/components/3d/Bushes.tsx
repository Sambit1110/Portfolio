import { useMemo } from "react";
import * as THREE from "three";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import type { TintedPlacement } from "@/lib/layout";
import { InstancedPart, composeMatrix } from "./InstancedPart";
import { foliageColors } from "./foliage";
import { singleton } from "./materials";
import { createFoliageMaterial } from "./wind";

const foliageMaterial = singleton(createFoliageMaterial);

type BushesProps = {
  bushes: TintedPlacement[];
  colliders?: boolean;
};

// Three overlapping blobs read as a soft bush from above.
const BLOBS = [
  { local: composeMatrix([0, 0.5, 0]), lighten: 0 },
  { local: composeMatrix([0.55, 0.35, 0.2], [0.5, 0.8, 0], 0.68), lighten: -0.03 },
  { local: composeMatrix([-0.3, 0.75, -0.15], [0.2, 0.3, 0], 0.55), lighten: 0.06 },
];

let geometry: THREE.BufferGeometry | null = null;
const getGeometry = () => (geometry ??= new THREE.IcosahedronGeometry(0.8, 1));

export function Bushes({ bushes, colliders = false }: BushesProps) {
  const { transforms, colors } = useMemo(() => {
    const tones = bushes.map((b) => b.tone);
    return {
      transforms: bushes.map((b) => composeMatrix(b.position, [0, b.rotationY, 0], b.scale)),
      colors: BLOBS.map((blob, i) => foliageColors(tones, bushes.length * 7 + i, blob.lighten)),
    };
  }, [bushes]);
  if (bushes.length === 0) return null;

  return (
    <group>
      {BLOBS.map((blob, i) => (
        <InstancedPart
          key={i}
          geometry={getGeometry()}
          material={foliageMaterial()}
          transforms={transforms}
          local={blob.local}
          colors={colors[i]}
          castShadow
        />
      ))}
      {colliders && (
        <RigidBody type="fixed" colliders={false}>
          {bushes.map((b, i) => (
            <CylinderCollider key={i} args={[0.6, 0.75 * b.scale[0]]} position={[b.position[0], 0.6, b.position[2]]} />
          ))}
        </RigidBody>
      )}
    </group>
  );
}
