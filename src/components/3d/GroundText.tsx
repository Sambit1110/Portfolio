import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBox, Text } from "@react-three/drei";
import { PALETTE, TONES } from "@/config/world";
import { matte } from "./materials";

export const FONT_BOLD = "/fonts/fredoka-700.woff";
export const FONT_SEMIBOLD = "/fonts/fredoka-600.woff";

const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];

type GroundTextProps = {
  children: string;
  position: [number, number];
  size?: number;
  bold?: boolean;
  letterSpacing?: number;
  opacity?: number;
};

// Lettering painted onto the ground. Unlit cream with a soft violet halo so it
// stays legible on warm sand in sun or shadow.
export function GroundText({ children, position, size = 0.8, bold = true, letterSpacing = 0.04, opacity = 1 }: GroundTextProps) {
  return (
    <Text
      font={bold ? FONT_BOLD : FONT_SEMIBOLD}
      position={[position[0], 0.03, position[1]]}
      rotation={FLAT}
      fontSize={size}
      letterSpacing={letterSpacing}
      color={PALETTE.text}
      fillOpacity={opacity}
      anchorX="center"
      anchorY="middle"
      outlineWidth={size * 0.06}
      outlineBlur={size * 0.25}
      outlineColor={PALETTE.shadow}
      outlineOpacity={0.55 * opacity}
    >
      {children}
    </Text>
  );
}

// Painted arrow; `angle` is the screen direction in radians (0 = right, PI/2 = up).
export function GroundArrow({ position, angle, size = 1 }: { position: [number, number]; angle: number; size?: number }) {
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.5, 0.11);
    s.lineTo(0.12, 0.11);
    s.lineTo(0.12, 0.32);
    s.lineTo(0.55, 0);
    s.lineTo(0.12, -0.32);
    s.lineTo(0.12, -0.11);
    s.lineTo(-0.5, -0.11);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, []);

  return (
    <mesh geometry={geometry} position={[position[0], 0.03, position[1]]} rotation={[-Math.PI / 2, 0, angle]} scale={size}>
      <meshBasicMaterial color={PALETTE.text} transparent opacity={0.92} />
    </mesh>
  );
}

// A raised keyboard key with its legend, part of the in-world controls hint.
export function Keycap({ label, position, width = 0.9 }: { label: string; position: [number, number]; width?: number }) {
  return (
    <group position={[position[0], 0, position[1]]}>
      <RoundedBox args={[width, 0.22, 0.9]} radius={0.08} smoothness={2} position-y={0.11} castShadow receiveShadow material={matte(PALETTE.text)} />
      <Text
        font={FONT_BOLD}
        position={[0, 0.23, 0.02]}
        rotation={FLAT}
        fontSize={0.42}
        color={TONES.ink}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}
