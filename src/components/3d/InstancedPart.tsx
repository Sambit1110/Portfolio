import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { Vec3 } from "@/lib/layout";

type InstancedPartProps = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  // World transform of each instance (e.g. each tree).
  transforms: THREE.Matrix4[];
  // Offset of this part relative to its instance (e.g. a canopy above the trunk).
  local?: THREE.Matrix4;
  colors?: THREE.Color[];
  castShadow?: boolean;
  receiveShadow?: boolean;
};

// One draw call for every copy of a static mesh part. Matrices are written once,
// so there is no per-frame cost.
export function InstancedPart({
  geometry,
  material,
  transforms,
  local,
  colors,
  castShadow = false,
  receiveShadow = false,
}: InstancedPartProps) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    transforms.forEach((transform, i) => {
      matrix.copy(transform);
      if (local) matrix.multiply(local);
      mesh.setMatrixAt(i, matrix);
      if (colors) mesh.setColorAt(i, colors[i]);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [transforms, local, colors]);

  return (
    <instancedMesh
      // Remount when the count changes; InstancedMesh capacity is fixed at creation.
      key={transforms.length}
      ref={ref}
      args={[geometry, material, transforms.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  );
}

const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();

export function composeMatrix(position: Vec3, rotation: Vec3 = [0, 0, 0], scale: Vec3 | number = 1) {
  const s = typeof scale === "number" ? [scale, scale, scale] : scale;
  return new THREE.Matrix4().compose(
    _position.set(...position),
    _quaternion.setFromEuler(_euler.set(...rotation)),
    _scale.set(s[0], s[1], s[2]),
  );
}
