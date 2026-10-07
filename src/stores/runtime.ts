import type { ZoneId } from "@/content/zones";

// A plain {x, y, z}: three.js math reads it directly (`vector.copy(point)`), and
// keeping three out of this module keeps it out of the HUD's first-load bundle.
export type Point3 = { x: number; y: number; z: number };

const point3 = (): Point3 => ({ x: 0, y: 0, z: 0 });

// Per-frame values shared between 3D systems. Mutated in useFrame, never rendered
// by React, so updating them costs nothing.
export const runtime = {
  player: {
    position: point3(),
    velocity: point3(),
    // Whether there has been any movement input yet (ends the arrival vista).
    hasMoved: false,
    // The robot's walk-cycle phase; a foot lands at every multiple of π.
    gaitPhase: 0,
  },
  camera: {
    // Point the camera is looking at, and its distance relative to play distance
    // (1 in play, larger in the vista). Lights and fog follow these.
    focus: point3(),
    ratio: 1,
    // One-shot: jump straight to the player instead of easing (fast travel).
    snap: false,
  },
  // Touch joystick, in screen space: x right, y up, length 0..1 (analog).
  joystick: { x: 0, y: 0 },
  // Guided tour: where the robot should walk this frame, and how hard (0..1).
  // Set by the tour driver, read by the player controller; null otherwise.
  autopilot: null as { x: number; z: number; throttle: number } | null,
  // Mirrors prefers-reduced-motion: ambient motion is stilled and camera glides
  // become cuts. Kept in sync by useReducedMotionSync.
  reducedMotion: false,
  // True while the AI Core is waiting on an answer, so the core can show it.
  guideThinking: false,
  // 0..1 glow level per zone, eased by its interaction marker. Landmarks read it
  // to brighten their cyan parts as the player approaches.
  zoneGlow: {
    ai: 0,
    projects: 0,
    skills: 0,
    experience: 0,
    about: 0,
    contact: 0,
  } satisfies Record<ZoneId, number>,
};

// Writes a position or velocity into a runtime point, in place.
export function setPoint(target: Point3, x: number, y: number, z: number) {
  target.x = x;
  target.y = y;
  target.z = z;
}
