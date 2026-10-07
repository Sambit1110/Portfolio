// Shared tuning values for the 3D world. Keep magic numbers here, not in components.

export const WORLD = {
  // The playable square is ±boundary; invisible walls sit on its edges.
  boundary: 36,
  // Dense forest fills the band between the wall and this distance (north, east, west).
  forestEdge: 58,
  // South edge of the world is a shoreline at roughly this Z.
  shoreZ: 38.5,
  // Half-size of the painted ground texture. Beyond it is plain ground colour.
  groundHalf: 64,
  seed: 11,
};

export const PLAYER = {
  spawn: [0, 0.6, 4.9] as const,
  speed: 5.5,
  // Higher = snappier acceleration and turning.
  acceleration: 12,
  turnSpeed: 14,
  // Radians of gait phase per unit of ground speed. Shared by the walk animation
  // and the footstep sounds so they stay in step.
  cadence: 2,
  // Capsule collider: total height = 2 * (halfHeight + radius).
  capsuleHalfHeight: 0.35,
  capsuleRadius: 0.45,
  killY: -10,
};

export const CAMERA = {
  // North-facing, pitched ~60° down. offset = distance * (0, sin, cos).
  pitch: (60 * Math.PI) / 180,
  // Long lens from far away: little perspective lean, robot ≈ 8% of screen height.
  distance: 38,
  fov: 24,
  // Seconds the follow spring takes to settle (lower = tighter follow).
  followSmooth: 0.26,
  // How far ahead of the player (in the walking direction) the camera looks.
  lookAhead: 1.25,
  lookAheadSpeed: 2.5,
  // Camera eases closer while a zone panel is open.
  focusZoom: 0.78,
  // Pull back on tall/narrow viewports so the player keeps context.
  portraitZoomOut: 1.35,
  // Diorama vista: the same 60° north-facing view, eased far back along its own
  // line so every landmark is in frame. Shown only on arrival and when chosen
  // from the menu ("View world"); gameplay never returns to it on its own.
  vista: {
    distance: 152,
    focus: [0, 2.5] as const,
    // Seconds the arrival vista holds before gliding down on its own.
    introHold: 2,
    // Seconds for a full glide between vista and play.
    duration: 2,
  },
};

export const PHYSICS = {
  gravity: [0, -20, 0] as const,
};

// Locked "Golden Hour Meadow" palette. CYAN means interactive / technology / AI
// and must not be used for decoration.
export const PALETTE = {
  ground: "#E7C7A0",
  path: "#D6A97C",
  foliage: "#23706A",
  foliageLight: "#3E9C84",
  amber: "#F0A04B",
  coral: "#E8735A",
  rock: "#5E4E6A",
  shadow: "#7A6A9C",
  text: "#FFF6EA",
  lantern: "#FFC66B",
  cyan: "#5DE0E6",
};

// Supporting tones derived from the palette (darker/lighter steps, never new hues).
export const TONES = {
  groundLight: "#EFD6B5",
  pathDark: "#C4946A",
  trunk: "#5A4256",
  wood: "#B4865E",
  woodDark: "#8C6448",
  rockLight: "#7D6C8A",
  ink: "#2F2638",
  water: "#4F9C93",
  foam: "#F4E6D2",
  dust: "#F3E2C8",
  smoke: "#C9BFD8",
};
