import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { PALETTE, WORLD } from "@/config/world";
import { paintGroundTexture } from "@/lib/textures";
import { terrainHeight } from "@/lib/terrain";
import { useDeviceStore } from "@/stores/deviceStore";

const COLLIDER_HALF = 80;
// A vertex every two units: plenty for the wooded bank's soft slopes (the
// walkable ground is flat anyway).
const SEGMENTS = 64;

// The painted ground as a heightfield: flat everywhere the robot walks, rising
// into the forest beyond the walls (see lib/terrain).
function createTerrainGeometry(size: number) {
  const geometry = new THREE.PlaneGeometry(size, size, SEGMENTS, SEGMENTS);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  geometry.computeVertexNormals();
  return geometry;
}

// Hand-painted texture plus a little procedural life, computed in world space
// so it never tiles: broad and fine value variation, a slow warm/cool drift
// across the meadow, and a mossy tint where the ground rises into the forest.
function createGroundMaterial(map: THREE.Texture) {
  const material = new THREE.MeshStandardMaterial({ map, roughness: 1 });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vGroundPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvGroundPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vGroundPos;
        float groundHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
        float groundNoise( vec2 p ) {
          vec2 i = floor( p );
          vec2 f = fract( p );
          f = f * f * ( 3.0 - 2.0 * f );
          return mix( mix( groundHash( i ), groundHash( i + vec2( 1.0, 0.0 ) ), f.x ),
                      mix( groundHash( i + vec2( 0.0, 1.0 ) ), groundHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
        }`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        vec2 gp = vGroundPos.xz;
        float broad = groundNoise( gp * 0.16 );
        float medium = groundNoise( gp * 0.85 + 17.0 );
        float fine = groundNoise( gp * 3.6 - 5.0 );
        diffuseColor.rgb *= 0.95 + broad * 0.07 + medium * 0.045 + fine * 0.03;
        diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 1.035, 0.985, 0.94 ), smoothstep( 0.4, 0.8, broad ) );
        float bank = smoothstep( 0.05, 1.1, vGroundPos.y );
        diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 0.66, 0.8, 0.68 ), bank * ( 0.55 + medium * 0.2 ) );`,
      );
  };
  material.customProgramCacheKey = () => "painted-ground";
  return material;
}

export function Ground() {
  // A sharper painting on desktop; phones keep the lighter texture.
  const pixels = useDeviceStore((s) => (s.quality === "high" ? 2048 : 1024));
  const size = WORLD.groundHalf * 2;
  const geometry = useMemo(() => createTerrainGeometry(size), [size]);
  const material = useMemo(() => createGroundMaterial(paintGroundTexture(pixels)), [pixels]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material],
  );

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[COLLIDER_HALF, 1, COLLIDER_HALF]} position={[0, -1, 0]} />
      </RigidBody>

      <mesh geometry={geometry} material={material} receiveShadow />

      {/* Plain ground beyond the painted area, in case the camera ever sees past it. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={PALETTE.ground} roughness={1} />
      </mesh>
    </group>
  );
}
