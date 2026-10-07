import type { Ref } from "react";
import * as THREE from "three";
import { getFadeTexture } from "@/lib/textures";
import { halo } from "./materials";

type HaloProps = {
  color: string;
  size: number;
  position?: [number, number, number];
  opacity?: number;
  additive?: boolean;
};

// Soft glow that always faces the camera: stands in for bloom.
export function Halo({ color, size, position = [0, 0, 0], opacity = 0.6, additive = true }: HaloProps) {
  return <sprite position={position} scale={[size, size, 1]} material={halo(color, opacity, additive)} />;
}

type LightPillarProps = {
  color: string;
  radius: number;
  height: number;
  position?: [number, number, number];
  opacity?: number;
  // Exposes the material so callers can animate its opacity.
  materialRef?: Ref<THREE.MeshBasicMaterial>;
};

// Open cylinder, bright at its base and fading upward. Normal blending keeps
// cyan reading as cyan against the bright ground.
export function LightPillar({ color, radius, height, position = [0, 0, 0], opacity = 0.3, materialRef }: LightPillarProps) {
  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]}>
      <cylinderGeometry args={[radius, radius, height, 20, 1, true]} />
      <meshBasicMaterial
        ref={materialRef}
        color={color}
        map={getFadeTexture()}
        transparent
        opacity={opacity}
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
        fog={false}
      />
    </mesh>
  );
}
