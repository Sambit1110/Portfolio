import { useFrame } from "@react-three/fiber";
import { runtime } from "@/stores/runtime";
import { wind } from "./wind";

// Drives the shared wind uniforms once per frame.
export function WindDriver() {
  useFrame(({ clock }, delta) => {
    wind.time.value = clock.elapsedTime;
    const target = runtime.reducedMotion ? 0 : 1;
    wind.amp.value += (target - wind.amp.value) * Math.min(1, delta * 2);
  });
  return null;
}
