import { CylinderCollider, RigidBody } from "@react-three/rapier";
import { PALETTE, TONES } from "@/config/world";
import { Halo } from "../Effects";
import { additive, glow, matte } from "../materials";

type LanternProps = {
  position: [number, number];
  height?: number;
};

// Wooden post with a hanging gold lantern. Emissive glass plus a halo sprite; no
// real light, so dozens of these cost almost nothing.
export function Lantern({ position, height = 2 }: LanternProps) {
  return (
    <group position={[position[0], 0, position[1]]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[height / 2, 0.18]} position={[0, height / 2, 0]} />
      </RigidBody>
      <mesh position={[0, height / 2, 0]} castShadow material={matte(TONES.woodDark)}>
        <cylinderGeometry args={[0.07, 0.1, height, 6]} />
      </mesh>
      <mesh position={[0.2, height - 0.05, 0]} castShadow material={matte(TONES.woodDark)}>
        <boxGeometry args={[0.5, 0.07, 0.07]} />
      </mesh>
      <mesh position={[0.38, 0.02, 0]} rotation-x={-Math.PI / 2} material={additive(PALETTE.lantern, 0.22)}>
        <planeGeometry args={[3.2, 3.2]} />
      </mesh>
      <group position={[0.38, height - 0.32, 0]}>
        <mesh material={glow(PALETTE.lantern, 1.6)}>
          <cylinderGeometry args={[0.13, 0.11, 0.3, 6]} />
        </mesh>
        <mesh position={[0, 0.2, 0]} material={matte(TONES.ink)}>
          <coneGeometry args={[0.17, 0.12, 6]} />
        </mesh>
        <Halo color={PALETTE.lantern} size={1.6} opacity={0.5} />
      </group>
    </group>
  );
}
