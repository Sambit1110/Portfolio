"use client";

import { useEffect } from "react";
import { runtime } from "@/stores/runtime";

// Mirrors prefers-reduced-motion into the 3D runtime, live.
export function useReducedMotionSync() {
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      runtime.reducedMotion = query.matches;
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
}
