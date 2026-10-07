import { create } from "zustand";

// Rendering quality. Desktop is always "high" (unchanged); touch devices start
// at "medium" or "low" and the performance monitor steps between them.
export type Quality = "high" | "medium" | "low";

type DeviceState = {
  // A touch-first device: show the joystick and interact button.
  touch: boolean;
  quality: Quality;
  setTouch: (touch: boolean) => void;
  setQuality: (quality: Quality) => void;
};

export const useDeviceStore = create<DeviceState>((set) => ({
  touch: false,
  quality: "high",
  setTouch: (touch) => set({ touch }),
  setQuality: (quality) => set({ quality }),
}));
