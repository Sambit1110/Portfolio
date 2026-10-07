import { useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { PALETTE } from "@/config/world";
import { FONT_BOLD } from "../GroundText";

type TargetLabelProps = {
  text: string;
  position: [number, number, number];
  // Glow from useTargetGlow: the label only appears while the target is near.
  glow: RefObject<number>;
  size?: number;
};

// drei types Text's ref as `any`; these are the troika fields animated here.
type TroikaText = THREE.Mesh & { fillOpacity: number; outlineOpacity: number };

// Floating name above an interactive object. Hidden at rest so the world stays
// uncluttered; fades and rises in as the player approaches.
export function TargetLabel({ text, position, glow, size = 0.42 }: TargetLabelProps) {
  const label = useRef<TroikaText>(null);

  useFrame(() => {
    const t = label.current;
    if (!t) return;
    // Only "near" (≥ 0.8) shows the label; the approach glow stays label-free.
    const g = THREE.MathUtils.clamp((glow.current - 0.45) / 0.35, 0, 1);
    t.visible = g > 0.02;
    t.fillOpacity = g;
    t.outlineOpacity = g * 0.6;
    t.position.y = (1 - g) * -0.25;
  });

  return (
    <Billboard position={position}>
      <Text
        ref={label}
        font={FONT_BOLD}
        fontSize={size}
        letterSpacing={0.03}
        color={PALETTE.text}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={size * 0.08}
        outlineBlur={size * 0.3}
        outlineColor={PALETTE.rock}
        fillOpacity={0}
        outlineOpacity={0}
      >
        {text}
      </Text>
    </Billboard>
  );
}
