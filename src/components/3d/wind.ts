import * as THREE from "three";

// One wind for the whole world. Grass and foliage shaders share these uniforms,
// so a single per-frame update animates every blade and canopy for free.
export const wind = {
  time: { value: 0 },
  // 1 normally; eased to 0 for prefers-reduced-motion.
  amp: { value: 1 },
};

// Hash of a world position to 0..1, so neighbouring plants never move in step.
const HASH = "fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 )";

type FoliageWind = {
  // Whole-plant sway in a gust (tall trees bend most, pines least).
  sway: number;
  // Small, quick leaf shimmer on top of the sway.
  flutter: number;
};

// Painted, wind-animated foliage for instanced trees and bushes.
// - Colour: per-vertex light and shade baked into the geometry, tinted per
//   instance; vertices marked as bark (aBark = 1) keep their own colour.
// - Wind: the sway is applied in world space after the instance transform, so a
//   gust leans every plant the same way, with a per-plant phase so they never
//   move in unison, and it grows with height so trunks stay planted. Shadows keep
//   the still silhouette; at this amplitude the difference is invisible.
export function createFoliageMaterial({ sway, flutter }: FoliageWind) {
  const material = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.92, vertexColors: true });
  const uniforms = { uSway: { value: sway }, uFlutter: { value: flutter } };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = wind.time;
    shader.uniforms.uWindAmp = wind.amp;
    shader.uniforms.uSway = uniforms.uSway;
    shader.uniforms.uFlutter = uniforms.uFlutter;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uWindTime;
        uniform float uWindAmp;
        uniform float uSway;
        uniform float uFlutter;
        attribute float aBark;
        float plantHash( vec2 p ) { return ${HASH}; }`,
      )
      .replace(
        "#include <color_vertex>",
        `#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
          vColor = vec4( 1.0 );
        #endif
        #ifdef USE_COLOR
          vColor.rgb *= color.rgb;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vColor.rgb *= mix( instanceColor.rgb, vec3( 1.0 ), aBark );
        #endif`,
      )
      .replace(
        "#include <project_vertex>",
        `vec4 mvPosition = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
          vec3 swayOrigin = ( instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
        #else
          vec3 swayOrigin = vec3( 0.0 );
        #endif
        float plantPhase = plantHash( swayOrigin.xz ) * 6.2832;
        float swayHeight = clamp( ( mvPosition.y - swayOrigin.y ) / 3.5, 0.0, 1.0 );
        float swayGust = sin( uWindTime * 0.8 + swayOrigin.x * 0.13 + swayOrigin.z * 0.09 + plantPhase * 0.35 )
                       + 0.35 * sin( uWindTime * 1.9 + plantPhase );
        float shimmer = sin( uWindTime * 3.7 + plantPhase + position.x * 3.1 + position.z * 2.3 ) * ( 1.0 - aBark );
        mvPosition.x += ( swayGust * 0.055 * uSway + shimmer * 0.018 * uFlutter ) * swayHeight * uWindAmp;
        mvPosition.z += ( swayGust * 0.025 * uSway + shimmer * 0.012 * uFlutter ) * swayHeight * uWindAmp;
        mvPosition.y += shimmer * 0.01 * uFlutter * swayHeight * uWindAmp;
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`,
      );
  };
  material.customProgramCacheKey = () => "wind-foliage-v2";
  return material;
}
