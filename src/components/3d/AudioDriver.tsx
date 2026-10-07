import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { audio } from "@/audio/AudioManager";
import { useWorldStore } from "@/stores/worldStore";
import { runtime } from "@/stores/runtime";

// Below this ground speed the robot is standing still: no footsteps.
const STEP_MIN_SPEED = 0.8;
// Listener updates per second; fades are smoothed inside the audio graph.
const UPDATE_HZ = 10;

// Feeds the audio system from the world: a footstep each time a foot lands
// (the same gait phase the walk animation uses), plus the listener's position,
// the AI Core's thinking state and the camera distance for zone fades.
export function AudioDriver() {
  const state = useRef({ lastFoot: 0, sinceUpdate: 0, thinking: 0 });

  useEffect(() => audio.init(), []);

  useFrame((_, delta) => {
    const s = state.current;
    const { velocity, position, gaitPhase } = runtime.player;

    // Footsteps follow the actual walk: a foot lands at every multiple of π.
    const foot = Math.floor(gaitPhase / Math.PI);
    if (foot !== s.lastFoot) {
      if (Math.hypot(velocity.x, velocity.z) > STEP_MIN_SPEED) audio.step((foot & 1) as 0 | 1);
      s.lastFoot = foot;
    }

    s.thinking += ((runtime.guideThinking ? 1 : 0) - s.thinking) * Math.min(1, delta * 4);
    s.sinceUpdate += delta;
    if (s.sinceUpdate < 1 / UPDATE_HZ) return;
    s.sinceUpdate = 0;
    audio.update({
      x: position.x,
      z: position.z,
      thinking: s.thinking,
      cameraRatio: runtime.camera.ratio,
      pageView: useWorldStore.getState().pageView,
    });
  });
  return null;
}
