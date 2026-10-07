import * as THREE from "three";

// One wind for the whole world. Grass and foliage shaders share these uniforms,
// so a single per-frame update animates every blade and canopy for free.
export const wind = {
  time: { value: 0 },
  // 1 normally; eased to 0 for prefers-reduced-motion.
  amp: { value: 1 },
};

// Gentle canopy sway for instanced trees and bushes. The offset is applied in
// world space after the instance transform, so every tree leans the same way
// in a gust, and it grows with height so trunks stay planted. Shadows keep the
// still silhouette; at this amplitude the difference is invisible.
export function createFoliageMaterial() {
  const material = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 1 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = wind.time;
    shader.uniforms.uWindAmp = wind.amp;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uWindTime;\nuniform float uWindAmp;")
      .replace(
        "#include <project_vertex>",
        `vec4 mvPosition = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
          vec3 swayOrigin = ( instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
        #else
          vec3 swayOrigin = vec3( 0.0 );
        #endif
        float swayHeight = clamp( mvPosition.y / 3.5, 0.0, 1.0 );
        float swayGust = sin( uWindTime * 0.8 + swayOrigin.x * 0.13 + swayOrigin.z * 0.09 )
                       + 0.35 * sin( uWindTime * 1.9 + swayOrigin.x * 0.41 );
        mvPosition.x += swayGust * 0.055 * swayHeight * uWindAmp;
        mvPosition.z += swayGust * 0.025 * swayHeight * uWindAmp;
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`,
      );
  };
  material.customProgramCacheKey = () => "wind-foliage";
  return material;
}
