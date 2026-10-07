import { useMemo } from "react";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import type { TintedPlacement } from "@/lib/layout";
import { InstancedPart, composeMatrix } from "./InstancedPart";
import { bushGeometry, foliageColors } from "./foliage";
import { singleton } from "./materials";
import { createFoliageMaterial } from "./wind";

// Low and leafy: little sway, a lively shimmer.
const bushMaterial = singleton(() => createFoliageMaterial({ sway: 0.6, flutter: 1.5 }));
const geometry = singleton(bushGeometry);

type BushesProps = {
  bushes: TintedPlacement[];
  colliders?: boolean;
};

export function Bushes({ bushes, colliders = false }: BushesProps) {
  const { transforms, colors } = useMemo(
    () => ({
      transforms: bushes.map((b) => composeMatrix(b.position, [0, b.rotationY, 0], b.scale)),
      colors: foliageColors(
        bushes.map((b) => b.tone),
        bushes.length * 7,
      ),
    }),
    [bushes],
  );
  if (bushes.length === 0) return null;

  return (
    <group>
      <InstancedPart geometry={geometry()} material={bushMaterial()} transforms={transforms} colors={colors} castShadow receiveShadow />
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
