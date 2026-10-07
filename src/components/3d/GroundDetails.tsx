import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PALETTE, TONES } from "@/config/world";
import { createRandom } from "@/lib/random";
import { LAYOUT, chunkByArea, type ScatterPlacement, type TintedPlacement } from "@/lib/layout";
import { InstancedPart, composeMatrix } from "./InstancedPart";
import { foliageColors } from "./foliage";
import { instancedMatte } from "./materials";
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
    </group>
  );
}
