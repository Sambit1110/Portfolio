"use client";

import { useEffect } from "react";
import { useDeviceStore, type Quality } from "@/stores/deviceStore";

// Touch-first means the primary pointer is coarse and can't hover — a property
// of the input hardware, not the screen width. A touchscreen laptop with a
// mouse stays on desktop controls until it's actually touched.
function isTouchFirst() {
  return window.matchMedia("(pointer: coarse)").matches && window.matchMedia("(hover: none)").matches;
}

// Starting quality for a touch device; the performance monitor refines it.
function initialTouchQuality(): Quality {
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  return cores >= 6 && memory >= 4 ? "medium" : "low";
}

export function useDeviceDetection() {
  useEffect(() => {
    const { setTouch, setQuality } = useDeviceStore.getState();
    const enableTouch = () => {
      if (useDeviceStore.getState().touch) return;
      setTouch(true);
      setQuality(initialTouchQuality());
    };
    if (isTouchFirst()) enableTouch();

    // Hybrid devices: the first real touch switches touch controls on.
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") enableTouch();
    };
    window.addEventListener("pointerdown", onPointer, { passive: true });
    return () => window.removeEventListener("pointerdown", onPointer);
  }, []);
}
