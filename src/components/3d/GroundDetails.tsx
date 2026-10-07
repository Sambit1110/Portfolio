import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PALETTE, TONES } from "@/config/world";
import { createRandom } from "@/lib/random";
import { LAYOUT, chunkByArea, type ScatterPlacement, type TintedPlacement } from "@/lib/layout";
import { distanceToPath } from "@/lib/paths";
import { InstancedPart, composeMatrix } from "./InstancedPart";
import { foliageColors, hash2 } from "./foliage";
import { instancedMatte, singleton } from "./materials";
import { buildProp, propMaterial } from "./props/build";
import { wind } from "./wind";
import { QUALITY_SETTINGS } from "@/config/quality";
import { useDeviceStore } from "@/stores/deviceStore";

const BLADE_HEIGHT = 0.42;

// Four soft, splayed blades merged into one geometry, base at y = 0.
function createTuftGeometry() {
  const blade = new THREE.ConeGeometry(0.1, BLADE_HEIGHT, 3);
  blade.translate(0, BLADE_HEIGHT / 2, 0);
  const blades = [-0.45, 0.1, 0.5, -0.2].map((tilt, i) => {
    const b = blade.clone();
    b.scale(1, i === 1 ? 1.15 : 0.85, 1);
    b.rotateZ(tilt);
    b.rotateY((i * Math.PI * 2) / 4 + 0.3);
    return b;
  });
  const merged = mergeGeometries(blades);
  blade.dispose();
  blades.forEach((b) => b.dispose());
  return merged;
}

// Instanced grass whose blade tips sway in the vertex shader. Each tuft's phase
// comes from its world position, so the wind rolls across the meadow.
function createGrassMaterial() {
  const material = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 1 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = wind.time;
    shader.uniforms.uWindAmp = wind.amp;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uWindTime;\nuniform float uWindAmp;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 tuftOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #else
          vec3 tuftOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #endif
        float gust = sin(uWindTime * 1.6 + tuftOrigin.x * 0.32 + tuftOrigin.z * 0.21)
                   + 0.35 * sin(uWindTime * 3.1 + tuftOrigin.x * 0.9);
        float bend = pow(position.y / ${BLADE_HEIGHT.toFixed(2)}, 2.0);
        transformed.x += gust * 0.1 * bend * uWindAmp;
        transformed.z += gust * 0.05 * bend * uWindAmp;`,
      );
  };
  material.customProgramCacheKey = () => "wind-grass";
  return material;
}

let shared: {
  tuft: THREE.BufferGeometry;
  grass: THREE.Material;
  stalk: THREE.BufferGeometry;
  bloom: THREE.BufferGeometry;
  pebble: THREE.BufferGeometry;
} | null = null;
const getShared = () =>
  (shared ??= {
    tuft: createTuftGeometry(),
    grass: createGrassMaterial(),
    stalk: new THREE.CylinderGeometry(0.02, 0.025, 0.24, 4).translate(0, 0.12, 0),
    bloom: new THREE.IcosahedronGeometry(0.11, 0).translate(0, 0.27, 0),
    pebble: new THREE.DodecahedronGeometry(1, 0),
  });

// A fallen leaf: a small, slightly cupped diamond lying on the ground.
const leafGeometry = singleton(() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0.02, -0.16, 0.08, 0, 0, 0, 0.02, 0.16, 0, 0.02, -0.16, 0, 0.02, 0.16, -0.08, 0, 0], 3));
  g.computeVertexNormals();
  return g;
});
const leafMaterial = singleton(() => new THREE.MeshStandardMaterial({ flatShading: true, roughness: 1, side: THREE.DoubleSide }));

// A small woodland mushroom (never cyan: cyan means interactive).
const mushroomGeometry = singleton(() =>
  buildProp([
    { geometry: new THREE.CylinderGeometry(0.035, 0.05, 0.2, 5), color: PALETTE.text, position: [0, 0.1, 0] },
    { geometry: new THREE.SphereGeometry(0.12, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), color: PALETTE.coral, position: [0, 0.18, 0], shade: 0.7 },
  ]),
);

const LEAF_TONES = [PALETTE.amber, PALETTE.coral, TONES.wood, "#9C8A4E"];

// Leaves scattered under the trees and bushes, a few mushrooms at their feet:
// small storytelling that makes the groves feel lived in. Positions come from
// a hash of each plant's position, so they never move between visits.
function createUndergrowth() {
  const leaves: THREE.Matrix4[] = [];
  const leafColors: THREE.Color[] = [];
  const mushrooms: THREE.Matrix4[] = [];
  const plants = [
    ...LAYOUT.trees.map((t) => ({ x: t.position[0], z: t.position[2], r: 1.9 * t.scale, n: 9 })),
    ...LAYOUT.bushes.map((b) => ({ x: b.position[0], z: b.position[2], r: 1.2 * b.scale[0], n: 3 })),
  ];
  for (const { x, z, r, n } of plants) {
    for (let i = 0; i < n; i++) {
      const a = hash2(x, z, i * 3 + 1) * Math.PI * 2;
      const d = (0.35 + hash2(x, z, i * 3 + 2) * 0.75) * r;
      const lx = x + Math.cos(a) * d;
      const lz = z + Math.sin(a) * d;
      if (distanceToPath(lx, lz) < 0.2) continue;
      leaves.push(composeMatrix([lx, 0.015, lz], [0, a * 3, 0], 0.8 + hash2(lx, lz, 9) * 0.6));
      leafColors.push(new THREE.Color(LEAF_TONES[Math.floor(hash2(lx, lz, 4) * LEAF_TONES.length)]).offsetHSL(0, 0, (hash2(lx, lz, 6) - 0.5) * 0.1));
    }
    if (n > 3 && hash2(x, z, 77) < 0.3) {
      const a = hash2(x, z, 78) * Math.PI * 2;
      for (let k = 0; k < 2 + Math.floor(hash2(x, z, 79) * 2); k++) {
        const mx = x + Math.cos(a + k * 0.5) * r * 0.75;
        const mz = z + Math.sin(a + k * 0.5) * r * 0.75;
        mushrooms.push(composeMatrix([mx, 0, mz], [0, k, 0], 0.7 + k * 0.25));
      }
    }
  }
  return { leaves, leafColors, mushrooms };
}

// Computed once: the layout never changes.
const undergrowth = singleton(createUndergrowth);

function toMatrices(items: ScatterPlacement[]) {
  return items.map((p) => composeMatrix(p.position, [0, p.rotationY, 0], p.scale));
}

function GrassChunk({ tufts }: { tufts: TintedPlacement[] }) {
  const { transforms, colors } = useMemo(
    () => ({
      transforms: toMatrices(tufts),
      // Lifted a step so meadows read as soft and sunlit rather than dark spikes.
      colors: foliageColors(
        tufts.map((t) => t.tone),
        tufts.length,
        0.06,
      ),
    }),
    [tufts],
  );
  const { tuft, grass } = getShared();
  return <InstancedPart geometry={tuft} material={grass} transforms={transforms} colors={colors} receiveShadow />;
}

export function GroundDetails() {
  const grassStride = QUALITY_SETTINGS[useDeviceStore((s) => s.quality)].grassStride;
  const data = useMemo(() => {
    const rng = createRandom(404);
    const flowerColors = LAYOUT.flowers.map((f) =>
      new THREE.Color(f.tone === "coral" ? PALETTE.coral : f.tone === "amber" ? PALETTE.amber : PALETTE.text).offsetHSL(
        0,
        0,
        rng.range(-0.04, 0.06),
      ),
    );
    return {
      // Low quality keeps every other tuft; meadows thin but keep their shape.
      grassChunks: chunkByArea(LAYOUT.grass, 16).map((chunk) => chunk.filter((_, i) => i % grassStride === 0)),
      flowers: toMatrices(LAYOUT.flowers),
      flowerColors,
      stalkColors: LAYOUT.flowers.map(() => new THREE.Color(PALETTE.foliage)),
      pebbles: toMatrices(LAYOUT.pebbles),
      pebbleColors: LAYOUT.pebbles.map(() =>
        new THREE.Color(rng.next() < 0.7 ? TONES.pathDark : TONES.rockLight).offsetHSL(0, 0, rng.range(-0.04, 0.04)),
      ),
    };
  }, [grassStride]);

  const { stalk, bloom, pebble } = getShared();
  const { leaves, leafColors, mushrooms } = undergrowth();

  return (
    <group>
      {data.grassChunks.map((chunk, i) => (
        <GrassChunk key={i} tufts={chunk} />
      ))}
      <InstancedPart geometry={stalk} material={instancedMatte()} transforms={data.flowers} colors={data.stalkColors} />
      <InstancedPart geometry={bloom} material={instancedMatte()} transforms={data.flowers} colors={data.flowerColors} />
      <InstancedPart
        geometry={pebble}
        material={instancedMatte()}
        transforms={data.pebbles}
        colors={data.pebbleColors}
        receiveShadow
      />
      <InstancedPart geometry={leafGeometry()} material={leafMaterial()} transforms={leaves} colors={leafColors} receiveShadow />
      <InstancedPart geometry={mushroomGeometry()} material={propMaterial()} transforms={mushrooms} castShadow receiveShadow />
    </group>
  );
}
