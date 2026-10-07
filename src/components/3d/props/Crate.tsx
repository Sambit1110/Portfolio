import { RigidBody } from "@react-three/rapier";
import { TONES } from "@/config/world";
import { matte } from "../materials";

const SIZE = 0.8;

// Dynamic body: the player can push these around.
export function Crate({ position }: { position: [number, number] }) {
  return (
    <RigidBody
      position={[position[0], SIZE / 2, position[1]]}
      colliders="cuboid"
      mass={1.5}
      linearDamping={2}
      angularDamping={2}
    >
      <mesh castShadow receiveShadow material={matte(TONES.wood)}>
        <boxGeometry args={[SIZE, SIZE, SIZE]} />
      </mesh>
      {/* Darker bands so the box reads as a crate. */}
      {[-0.3, 0.3].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={matte(TONES.woodDark)}>
          <boxGeometry args={[SIZE + 0.02, 0.1, SIZE + 0.02]} />
        </mesh>
      ))}
    </RigidBody>
  );
}
