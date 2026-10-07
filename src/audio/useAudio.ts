"use client";

import { useEffect, useSyncExternalStore } from "react";
import { audio, type AudioSnapshot } from "./AudioManager";

const SERVER_SNAPSHOT: AudioSnapshot = { muted: false, running: false };

// Sound state for the UI, plus the toggle. Initialises the audio system (which
// still waits for a user gesture before making any sound).
export function useAudio() {
  useEffect(() => audio.init(), []);
  const snapshot = useSyncExternalStore(audio.subscribe, audio.getSnapshot, () => SERVER_SNAPSHOT);
  return { ...snapshot, toggle: audio.toggleMuted };
}
