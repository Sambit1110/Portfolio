import { useMemo } from "react";
import * as THREE from "three";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import { TONES } from "@/config/world";
import type { TreePlacement } from "@/lib/layout";
import { InstancedPart, composeMatrix } from "./InstancedPart";
import { foliageColors } from "./foliage";
import { instancedMatte, singleton } from "./materials";
import { createFoliageMaterial } from "./wind";

const foliageMaterial = singleton(createFoliageMaterial);

type TreesProps = {
  trees: TreePlacement[];
  colliders?: boolean;
};

type Part = {
  geometry: THREE.BufferGeometry;
  local: THREE.Matrix4;
  // null = trunk colour; otherwise how much to lighten the foliage colour.
  lighten: number | null;
};

// Geometries are created once and shared by every Trees chunk.
let parts: Record<TreePlacement["kind"], Part[]> | null = null;
function getParts() {
  return (parts ??= {
    // Wide, rounded canopy built from overlapping blobs.
    round: [
      { geometry: new THREE.CylinderGeometry(0.16, 0.24, 1.3, 6), local: composeMatrix([0, 0.65, 0]), lighten: null },
      { geometry: new THREE.IcosahedronGeometry(1.05, 1), local: composeMatrix([0, 2, 0]), lighten: 0 },
      { geometry: new THREE.IcosahedronGeometry(0.7, 0), local: composeMatrix([0.7, 1.7, 0.25], [0.3, 0.5, 0]), lighten: -0.03 },
      { geometry: new THREE.IcosahedronGeometry(0.62, 0), local: composeMatrix([-0.55, 1.85, -0.4], [0.6, 0.2, 0]), lighten: -0.02 },
      { geometry: new THREE.IcosahedronGeometry(0.55, 0), local: composeMatrix([0.1, 2.8, 0.1], [0.2, 0.9, 0]), lighten: 0.07 },
    ],
    // Taller, columnar tree of stacked blobs.
    tall: [
      { geometry: new THREE.CylinderGeometry(0.14, 0.2, 1.6, 6), local: composeMatrix([0, 0.8, 0]), lighten: null },
      { geometry: new THREE.IcosahedronGeometry(0.85, 1), local: composeMatrix([0, 1.9, 0]), lighten: -0.02 },
      { geometry: new THREE.IcosahedronGeometry(0.7, 1), local: composeMatrix([0, 2.8, 0], [0, 0.6, 0]), lighten: 0.02 },
      { geometry: new THREE.IcosahedronGeometry(0.48, 0), local: composeMatrix([0, 3.55, 0], [0.4, 0, 0.3]), lighten: 0.08 },
    ],
  });
}

// Trunk colliders are widened to roughly match the lowest foliage.
const COLLIDER_RADIUS = { round: 0.6, tall: 0.5 };

export function Trees({ trees, colliders = false }: TreesProps) {
  const groups = useMemo(() => {
    const trunk = new THREE.Color(TONES.trunk);
    return (["round", "tall"] as const).map((kind) => {
      const ofKind = trees.filter((t) => t.kind === kind);
      const transforms = ofKind.map((t) => composeMatrix(t.position, [0, t.rotationY, 0], t.scale));
      const tones = ofKind.map((t) => t.tone);
      const seed = Math.round(Math.abs(ofKind[0]?.position[0] ?? 0) * 100) + ofKind.length;
      return {
        kind,
        transforms,
        parts: getParts()[kind].map((part) => ({
          ...part,
          colors: part.lighten === null ? ofKind.map(() => trunk) : foliageColors(tones, seed, part.lighten),
        })),
      };
    });
  }, [trees]);

  return (
    <group>
      {groups.map(({ kind, transforms, parts }) =>
        transforms.length === 0
          ? null
          : parts.map((part, i) => (
              <InstancedPart
                key={`${kind}-${i}`}
                geometry={part.geometry}
                material={part.lighten === null ? instancedMatte() : foliageMaterial()}
                transforms={transforms}
                local={part.local}
                colors={part.colors}
                castShadow
              />
            )),
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
