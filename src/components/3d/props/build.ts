import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { singleton } from "../materials";

// Static detail for landmarks: many small painted parts merged into one mesh
// with vertex colours, so a richly dressed scene costs a single draw call.

export type PropPart = {
  geometry: THREE.BufferGeometry;
  color: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
  // Brightness at the part's bottom relative to its top (painted shading).
  shade?: number;
};

const matrix = new THREE.Matrix4();
const quaternion = new THREE.Quaternion();
const euler = new THREE.Euler();
const vPosition = new THREE.Vector3();
const vScale = new THREE.Vector3();

export function buildProp(parts: PropPart[]) {
  const pieces = parts.map(({ geometry, color, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, shade = 0.82 }) => {
    const s = typeof scale === "number" ? [scale, scale, scale] : scale;
    const g = (geometry.index ? geometry.toNonIndexed() : geometry.clone()).applyMatrix4(
      matrix.compose(vPosition.set(...position), quaternion.setFromEuler(euler.set(...rotation)), vScale.set(s[0], s[1], s[2])),
    );
    for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
    g.computeBoundingBox();
    const { min, max } = g.boundingBox!;
    const base = new THREE.Color(color);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getY(i) - min.y) / Math.max(max.y - min.y, 1e-6);
      const k = shade + (1 - shade) * t;
      colors.set([base.r * k, base.g * k, base.b * k], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.dispose();
    return g;
  });
  const merged = mergeGeometries(pieces)!;
  pieces.forEach((p) => p.dispose());
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  return merged;
}

// The shared material for built props: flat-shaded, painted by vertex colour.
export const propMaterial = singleton(() => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }));
