import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { INTERACTABLE_BY_KEY, sameTarget, targetKey, type Target } from "@/lib/interactables";
import { useWorldStore } from "@/stores/worldStore";
import { runtime } from "@/stores/runtime";

// How far outside a target's radius it starts to stir.
const APPROACH = 2.2;

// Eased 0..1 glow for one target: 0 idle, up to 0.3 while the player approaches,
// 0.8 when at it, 1 while its panel is open. Read `.current` inside useFrame.
export function useTargetGlow(target: Target) {
  const glow = useRef(0);
  useFrame((_, delta) => {
    const { nearby, active } = useWorldStore.getState();
    const placed = INTERACTABLE_BY_KEY.get(targetKey(target));
    let approach = 0;
    if (placed) {
      const { x, z } = runtime.player.position;
      const d = Math.hypot(x - placed.position[0], z - placed.position[1]);
      // three's smoothstep is (x, min, max): full at the radius, none APPROACH out.
      approach = (1 - THREE.MathUtils.smoothstep(d, placed.radius, placed.radius + APPROACH)) * 0.3;
    }
    const want = sameTarget(active, target) ? 1 : sameTarget(nearby, target) ? 0.8 : approach;
    glow.current = THREE.MathUtils.lerp(glow.current, want, 1 - Math.exp(-7 * Math.min(delta, 0.1)));
  });
  return glow;
}
