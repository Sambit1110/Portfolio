import { ZONE_BY_ID, type ZoneId } from "@/content/zones";
import { aiCore, banners, campfire, chime, crystals, failTone, footstep, meadow, shore, workshop, type Voice } from "./sounds";

// Client-side audio for the world. One AudioContext, created only on the first
// user gesture (never autoplayed), with master / ambient / effects buses. Every
// call is fail-safe: if audio can't start, the world simply stays silent.

export type AudioBus = "master" | "ambient" | "effects";
export type AudioEffect = "reply" | "fail";

type Prefs = { muted: boolean; master: number; ambient: number; effects: number };
export type AudioSnapshot = { muted: boolean; running: boolean };

const STORAGE_KEY = "sambit-portfolio:audio:v1";
const DEFAULT_PREFS: Prefs = { muted: false, master: 0.8, ambient: 0.6, effects: 0.8 };
// Seconds for level changes to settle: fades, never cuts.
const FADE = 0.35;

// Each zone's voice, its loudness, and how far beyond its ring it can be heard.
const ZONE_SOUND: Record<ZoneId, { build: (ctx: AudioContext) => Voice; level: number; reach: number }> = {
  about: { build: campfire, level: 0.55, reach: 13 },
  contact: { build: shore, level: 0.3, reach: 15 },
  projects: { build: workshop, level: 0.32, reach: 12 },
  skills: { build: crystals, level: 0.22, reach: 12 },
  experience: { build: banners, level: 0.28, reach: 11 },
  ai: { build: aiCore, level: 0.42, reach: 9 },
};

type ZoneState = { voice: Voice | null; panner: StereoPannerNode | null; silentFor: number };

export type WorldListener = {
  x: number;
  z: number;
  // 0 idle .. 1 while the AI guide is working.
  thinking: number;
  // Camera distance relative to play distance (1 in play, ~4 in the vista).
  cameraRatio: number;
  // The HTML page is covering the world.
  pageView: boolean;
};

const smoothstep = (x: number, min: number, max: number) => {
  const t = Math.min(Math.max((x - min) / (max - min), 0), 1);
  return t * t * (3 - 2 * t);
};

class AudioManager {
  private ctx: AudioContext | null = null;
  private buses: Record<AudioBus, GainNode> | null = null;
  private ambience: Voice | null = null;
  private zones = new Map<ZoneId, ZoneState>();
  private prefs: Prefs = DEFAULT_PREFS;
  private snapshot: AudioSnapshot = { muted: false, running: false };
  private subscribers = new Set<() => void>();
  private initialised = false;
  private lastStep = 0;
  private suspendTimer: ReturnType<typeof setTimeout> | null = null;

  // Load preferences and wait for the first user gesture. Safe to call often.
  init() {
    if (this.initialised || typeof window === "undefined") return;
    this.initialised = true;
    this.prefs = { ...DEFAULT_PREFS, ...this.readPrefs() };
    this.publish();
    // The first gesture creates the context. Later gestures resume it whenever
    // it should be playing but isn't: iOS can leave it suspended or
    // "interrupted" (a call, Siri, another app) until the visitor next taps.
    const onGesture = () => {
      if (!this.prefs.muted && this.ctx?.state !== "running") this.unlock();
    };
    for (const type of GESTURES) window.addEventListener(type, onGesture, true);
    document.addEventListener("visibilitychange", () => this.syncRunning());
  }

  // ── State for the UI ──
  subscribe = (callback: () => void) => {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  };
  getSnapshot = () => this.snapshot;

  toggleMuted = () => this.setMuted(!this.prefs.muted);

  setMuted(muted: boolean) {
    this.prefs = { ...this.prefs, muted };
    this.savePrefs();
    // The toggle click is itself a gesture: a good moment to unlock.
    if (!muted) this.unlock();
    this.applyLevels();
    this.syncRunning();
    this.publish();
  }

  setVolume(bus: AudioBus, value: number) {
    this.prefs = { ...this.prefs, [bus]: Math.min(Math.max(value, 0), 1) };
    this.savePrefs();
    this.applyLevels();
  }

  // ── Called from the world ──

  // Per-update listener state (about 10 times a second is plenty).
  update(listener: WorldListener) {
    const ctx = this.ctx;
    if (!ctx || !this.buses || ctx.state !== "running") return;
    try {
      const now = ctx.currentTime;
      // The vista pulls the "ears" back with the camera; the page view ducks the world.
      const distanceScale = (1 / Math.max(listener.cameraRatio, 1)) * (listener.pageView ? 0.25 : 1);
      this.ambience?.output.gain.setTargetAtTime(listener.pageView ? 0.25 : 1, now, FADE);

      for (const [id, sound] of Object.entries(ZONE_SOUND) as [ZoneId, (typeof ZONE_SOUND)[ZoneId]][]) {
        const zone = ZONE_BY_ID[id];
        const dx = zone.position[0] - listener.x;
        const d = Math.hypot(dx, zone.position[1] - listener.z);
        const level = sound.level * (1 - smoothstep(d, zone.radius * 0.5, zone.radius + sound.reach)) * distanceScale;
        const state = this.zones.get(id) ?? { voice: null, panner: null, silentFor: 0 };
        this.zones.set(id, state);

        if (level > 0.002 && !state.voice) {
          // Within earshot: start the voice silent and let it fade up.
          state.voice = sound.build(ctx);
          state.panner = ctx.createStereoPanner();
          state.voice.output.connect(state.panner).connect(this.buses.ambient);
        }
        if (!state.voice || !state.panner) continue;
        state.voice.output.gain.setTargetAtTime(level, now, FADE);
        // Camera faces north, so world x is screen left/right.
        state.panner.pan.setTargetAtTime(Math.max(-0.8, Math.min(0.8, dx / 12)), now, FADE);
        if (id === "ai") state.voice.params.thinking?.setTargetAtTime(listener.thinking * 0.06, now, 0.25);

        // Out of earshot for a while: stop the voice to keep sources low.
        state.silentFor = level <= 0.002 ? state.silentFor + 1 : 0;
        if (state.silentFor > 30) {
          state.voice.stop();
          state.panner.disconnect();
          state.voice = null;
          state.panner = null;
          state.silentFor = 0;
        }
      }
    } catch {
      // Audio must never break the world.
    }
  }

  // One footfall; `side` alternates left/right for a touch of stereo.
  step(side: 0 | 1) {
    const ctx = this.ctx;
    if (!ctx || !this.buses || ctx.state !== "running") return;
    const now = performance.now();
    if (now - this.lastStep < 110) return;
    this.lastStep = now;
    try {
      footstep(ctx, this.buses.effects, side ? 0.12 : -0.12);
    } catch {
      // Skip this step.
    }
  }

  play(effect: AudioEffect) {
    const ctx = this.ctx;
    if (!ctx || !this.buses || ctx.state !== "running") return;
    try {
      if (effect === "reply") chime(ctx, this.buses.effects);
      else failTone(ctx, this.buses.effects);
    } catch {
      // Skip the effect.
    }
  }

  // ── Internals ──

  private unlock() {
    try {
      if (!this.ctx) {
        const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Context) return;
        const ctx = new Context({ latencyHint: "playback" });
        const master = ctx.createGain();
        master.gain.value = 0;
        master.connect(ctx.destination);
        const ambient = ctx.createGain();
        ambient.connect(master);
        const effects = ctx.createGain();
        effects.connect(master);
        this.ctx = ctx;
        this.buses = { master, ambient, effects };
        this.ambience = meadow(ctx);
        this.ambience.output.gain.value = 1;
        this.ambience.output.connect(ambient);
        ctx.addEventListener("statechange", () => this.publish());
      }
      this.applyLevels();
      this.syncRunning();
    } catch {
      // Audio unavailable: stay silent.
      this.ctx = null;
      this.buses = null;
    }
  }

  private applyLevels() {
    const ctx = this.ctx;
    if (!ctx || !this.buses) return;
    const now = ctx.currentTime;
    const { muted, master, ambient, effects } = this.prefs;
    this.buses.master.gain.setTargetAtTime(muted ? 0 : master, now, muted ? 0.08 : FADE);
    this.buses.ambient.gain.setTargetAtTime(ambient, now, FADE);
    this.buses.effects.gain.setTargetAtTime(effects, now, FADE);
  }

  // Run only when audible: suspended while muted or while the tab is hidden,
  // so silent audio costs nothing. Muting fades out before suspending.
  private syncRunning() {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.suspendTimer) clearTimeout(this.suspendTimer);
    const shouldRun = !this.prefs.muted && document.visibilityState === "visible";
    if (shouldRun) {
      if (ctx.state !== "running") ctx.resume().catch(() => {});
    } else {
      this.suspendTimer = setTimeout(() => ctx.suspend().catch(() => {}), 400);
    }
  }

  private publish() {
    const next = { muted: this.prefs.muted, running: this.ctx?.state === "running" };
    if (next.muted === this.snapshot.muted && next.running === this.snapshot.running) return;
    this.snapshot = next;
    for (const callback of this.subscribers) callback();
  }

  private readPrefs(): Partial<Prefs> {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Prefs>;
    } catch {
      return {};
    }
  }

  private savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.prefs));
    } catch {
      // Private mode or storage disabled: the preference just won't persist.
    }
  }
}

// Gestures browsers accept for starting audio.
const GESTURES = ["pointerdown", "keydown", "touchend"] as const;

export const audio = new AudioManager();
