import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { WORLD } from "@/config/world";

const HALF_HEIGHT = 3;
const HALF_THICKNESS = 0.5;

// Four invisible walls whose inner faces sit exactly on ±WORLD.boundary. The
// forest (north, east, west) and the sea (south) make the edge read naturally.
export function Boundaries() {
  const b = WORLD.boundary + HALF_THICKNESS;
  const span = WORLD.boundary + HALF_THICKNESS * 2;

  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[span, HALF_HEIGHT, HALF_THICKNESS]} position={[0, HALF_HEIGHT, -b]} friction={0} />
      <CuboidCollider args={[span, HALF_HEIGHT, HALF_THICKNESS]} position={[0, HALF_HEIGHT, b]} friction={0} />
      <CuboidCollider args={[HALF_THICKNESS, HALF_HEIGHT, span]} position={[-b, HALF_HEIGHT, 0]} friction={0} />
      <CuboidCollider args={[HALF_THICKNESS, HALF_HEIGHT, span]} position={[b, HALF_HEIGHT, 0]} friction={0} />
    </RigidBody>
  );
}
