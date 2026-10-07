import type { KeyboardControlsEntry } from "@react-three/drei";

export enum Controls {
  forward = "forward",
  back = "back",
  left = "left",
  right = "right",
}

// Physical key codes, so WASD stays in place on non-QWERTY layouts.
export const KEYBOARD_MAP: KeyboardControlsEntry<Controls>[] = [
  { name: Controls.forward, keys: ["KeyW", "ArrowUp"] },
  { name: Controls.back, keys: ["KeyS", "ArrowDown"] },
  { name: Controls.left, keys: ["KeyA", "ArrowLeft"] },
  { name: Controls.right, keys: ["KeyD", "ArrowRight"] },
];
