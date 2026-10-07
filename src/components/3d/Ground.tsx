import { useEffect, useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { PALETTE, WORLD } from "@/config/world";
import { paintGroundTexture } from "@/lib/textures";

const COLLIDER_HALF = 80;

export function Ground() {
  const texture = useMemo(() => paintGroundTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  const size = WORLD.groundHalf * 2;

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[COLLIDER_HALF, 1, COLLIDER_HALF]} position={[0, -1, 0]} />
      </RigidBody>

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial map={texture} roughness={1} />
      </mesh>

      {/* Plain ground beyond the painted area, in case the camera ever sees past it. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={PALETTE.ground} roughness={1} />
      </mesh>
    </group>
  );
}
