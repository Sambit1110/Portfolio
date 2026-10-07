import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { TONES, WORLD } from "@/config/world";

const EXTENT = 160;

function shoreline(x: number) {
  return WORLD.shoreZ + Math.sin(x * 0.27) * 0.5 + Math.sin(x * 0.071 + 1.2) * 1.1;
}

// Flat sea south of the shore. The shape's north edge follows a wavy shoreline;
// a slightly larger foam shape underneath shows as a pale band along it.
function createSeaGeometry(inset: number) {
  const shape = new THREE.Shape();
  // Shape space is (x, -z) so that rotating onto the ground plane keeps +Y up.
  shape.moveTo(-EXTENT, -EXTENT);
  shape.lineTo(EXTENT, -EXTENT);
  for (let x = EXTENT; x >= -EXTENT; x -= 1) shape.lineTo(x, -(shoreline(x) + inset));
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

export function Water() {
  const { sea, foam, material } = useMemo(
    () => ({
      sea: createSeaGeometry(0),
      foam: createSeaGeometry(-0.7),
      material: new THREE.MeshStandardMaterial({ color: TONES.water, roughness: 0.35 }),
    }),
    [],
  );

  // Slow breathing of the foam band.
  const foamMaterial = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (foamMaterial.current) foamMaterial.current.opacity = 0.75 + Math.sin(clock.elapsedTime * 0.9) * 0.2;
  });

  return (
    <group>
      <mesh geometry={foam} position-y={0.012} receiveShadow>
        <meshStandardMaterial ref={foamMaterial} color={TONES.foam} roughness={1} transparent />
      </mesh>
      <mesh geometry={sea} material={material} position-y={0.03} receiveShadow />
    </group>
  );
}
