import { useMemo } from "react";
import * as THREE from "three";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import type { TreePlacement } from "@/lib/layout";
import { terrainHeight } from "@/lib/terrain";
import { InstancedPart, composeMatrix } from "./InstancedPart";
import { foliageColors, hash2, pineTreeGeometry, roundTreeGeometry, tallTreeGeometry } from "./foliage";
import { singleton } from "./materials";
import { createFoliageMaterial } from "./wind";

// Broadleaf crowns sway freely; pines are stiffer and barely shimmer.
const broadleafMaterial = singleton(() => createFoliageMaterial({ sway: 1, flutter: 1 }));
const pineMaterial = singleton(() => createFoliageMaterial({ sway: 0.55, flutter: 0.35 }));

type Species = "round" | "tall" | "pine";

// One merged geometry per species, shared by every Trees chunk.
const GEOMETRY: Record<Species, () => THREE.BufferGeometry> = {
  round: singleton(roundTreeGeometry),
  tall: singleton(tallTreeGeometry),
  pine: singleton(pineTreeGeometry),
};

// Pines join the mix by position (the layout itself is unchanged): half of the
// tall trees everywhere, and some of the rounded ones in the forest beyond the
// walls, so the border gains a varied, pointed silhouette.
function speciesOf(t: TreePlacement, border: boolean): Species {
  const h = hash2(t.position[0], t.position[2]);
  if (t.kind === "tall") return h < 0.5 ? "pine" : "tall";
  return border && h < 0.3 ? "pine" : "round";
}

type TreesProps = {
  trees: TreePlacement[];
  colliders?: boolean;
};

// Trunk colliders are widened to roughly match the lowest foliage.
const COLLIDER_RADIUS = { round: 0.6, tall: 0.5 };

export function Trees({ trees, colliders = false }: TreesProps) {
  const groups = useMemo(() => {
    return (["round", "tall", "pine"] as const).map((species) => {
      const ofSpecies = trees.filter((t) => speciesOf(t, !colliders) === species);
      const seed = Math.round(Math.abs(ofSpecies[0]?.position[0] ?? 0) * 100) + ofSpecies.length;
      return {
        species,
        // Each tree gets its own height, slenderness and a slight lean.
        transforms: ofSpecies.map((t) => {
          const [x, , z] = t.position;
          const stretch = 0.9 + hash2(x, z, 1) * 0.28;
          const lean = (hash2(x, z, 2) - 0.5) * 0.08;
          return composeMatrix([x, terrainHeight(x, z), z], [lean, t.rotationY, -lean * 0.6], [t.scale, t.scale * stretch, t.scale]);
        }),
        colors: foliageColors(
          ofSpecies.map((t) => t.tone),
          seed,
        ),
      };
    });
  }, [trees, colliders]);

  return (
    <group>
      {groups.map(({ species, transforms, colors }) =>
        transforms.length === 0 ? null : (
          <InstancedPart
            key={species}
            geometry={GEOMETRY[species]()}
            material={species === "pine" ? pineMaterial() : broadleafMaterial()}
            transforms={transforms}
            colors={colors}
            castShadow
            receiveShadow
          />
        ),
      )}

      {colliders && (
        <RigidBody type="fixed" colliders={false}>
          {trees.map((t, i) => (
            <CylinderCollider
              key={i}
              args={[1, COLLIDER_RADIUS[t.kind] * t.scale]}
              position={[t.position[0], 1, t.position[2]]}
            />
          ))}
        </RigidBody>
      )}
    </group>
  );
}
