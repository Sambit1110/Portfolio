"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { KeyboardControls, PerformanceMonitor } from "@react-three/drei";
import { KEYBOARD_MAP } from "@/config/controls";
import { useReducedMotionSync } from "@/hooks/useReducedMotionSync";
import { QUALITY_SETTINGS, stepQuality } from "@/config/quality";
import { useDeviceStore } from "@/stores/deviceStore";
import { useWorldStore } from "@/stores/worldStore";
import { PostEffects } from "./PostEffects";
import { World } from "./World";

// Quality steps down below 45 fps and back up at 58+, so a steady 60 Hz phone
// recovers (drei's default only steps up above the refresh rate).
const FPS_BOUNDS = (): [number, number] => [45, 58];
// Start judging only after the arrival vista and first shader compiles.
const MONITOR_DELAY_MS = 6000;
// After stepping down, wait this long before trying a step back up, so a
// device right on the edge doesn't oscillate (each switch resizes the canvas).
const STEP_UP_COOLDOWN_MS = 15000;
let lastDecline = 0;

// Matches the fog colour so the far edge of the world dissolves into haze.
const HAZE = "#E9CBA5";

// How long the page view must cover the world before rendering pauses: long
// enough for the audio driver to duck the world's sound first.
const PAUSE_DELAY_MS = 500;

// While the HTML page covers the world none of it is visible, so it stops
// rendering. The clock resumes where it stopped, so time-based animation carries
// on as if no time had passed.
function PauseWhileCovered({ covered }: { covered: boolean }) {
  const get = useThree((state) => state.get);
  useEffect(() => {
    if (!covered) return;
    let elapsed: number | null = null;
    const timer = setTimeout(() => {
      elapsed = get().clock.elapsedTime;
      get().setFrameloop("never");
    }, PAUSE_DELAY_MS);
    return () => {
      clearTimeout(timer);
      if (elapsed === null) return;
      // setFrameloop restarts the clock from zero; put its time back, then
      // wake the render loop.
      get().setFrameloop("always");
      get().clock.elapsedTime = elapsed;
      get().invalidate();
    };
  }, [covered, get]);
  return null;
}

// A key held while the window loses focus never sends its keyup (switching apps,
// Cmd+Tab; on macOS any key released while Cmd is down), and the robot would keep
// walking on its own. Release every movement key at those moments instead.
function useReleaseKeysOnBlur() {
  useEffect(() => {
    const release = () => {
      for (const { keys } of KEYBOARD_MAP) for (const code of keys) window.dispatchEvent(new KeyboardEvent("keyup", { code }));
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") release();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Meta") release();
    };
    window.addEventListener("blur", release);
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", release);
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}

export default function Experience() {
  useReducedMotionSync();
  useReleaseKeysOnBlur();
  const quality = useDeviceStore((s) => s.quality);
  const touch = useDeviceStore((s) => s.touch);
  // Antialiasing can't change after the context exists: decide once at mount.
  const [antialias] = useState(() => useDeviceStore.getState().quality !== "low");
  const worldReady = useWorldStore((s) => s.worldReady);
  const covered = useWorldStore((s) => s.pageView);
  const [monitoring, setMonitoring] = useState(false);
  useEffect(() => {
    if (!worldReady) return;
    const timer = setTimeout(() => setMonitoring(true), MONITOR_DELAY_MS);
    return () => clearTimeout(timer);
  }, [worldReady]);
  const step = (direction: 1 | -1) => {
    const now = performance.now();
    if (direction === -1) lastDecline = now;
    else if (now - lastDecline < STEP_UP_COOLDOWN_MS) return;
    const { quality: current, setQuality } = useDeviceStore.getState();
    const next = stepQuality(current, direction);
    if (next !== current) setQuality(next);
  };
  return (
    <KeyboardControls map={KEYBOARD_MAP}>
      <Canvas
        // No tone mapping: the locked palette renders at its true hex values.
        flat
        shadows="percentage"
        dpr={QUALITY_SETTINGS[quality].dpr}
        gl={{ antialias, powerPreference: "high-performance" }}
      >
        <color attach="background" args={[HAZE]} />
        <PauseWhileCovered covered={covered} />
        {/* Touch devices only: step quality down when frames drop, up when there's
            headroom. Desktop always renders at the approved "high" settings. It
            restarts fresh after a pause, so the pause never reads as a drop. */}
        {touch && monitoring && !covered && (
          <PerformanceMonitor bounds={FPS_BOUNDS} onDecline={() => step(-1)} onIncline={() => step(1)} />
        )}
        {QUALITY_SETTINGS[quality].bloom && <PostEffects />}
        {/* Rapier's WASM and the ground fonts load asynchronously. */}
        <Suspense fallback={null}>
          <World />
        </Suspense>
      </Canvas>
    </KeyboardControls>
  );
}
