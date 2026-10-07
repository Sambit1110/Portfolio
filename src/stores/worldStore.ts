import { create } from "zustand";
import { PLAYER } from "@/config/world";
import { ZONE_BY_ID, type ZoneId } from "@/content/zones";
import { sameTarget, zoneOf, type Target } from "@/lib/interactables";
import { runtime } from "@/stores/runtime";

// Fade time of the fast-travel veil, each way.
export const TRAVEL_VEIL_MS = 220;

// Pending fast-travel steps. A new trip cancels them, so a quick second trip
// can't lift the veil before its own jump.
let travelTimers: ReturnType<typeof setTimeout>[] = [];

// A zone opened for the first time, and how many zones that makes.
export type Discovery = { zone: ZoneId; count: number };

// The guided tour, as one mode. While "touring", the robot walks itself and the
// player's movement input is ignored (any movement key, a touch on the joystick,
// Escape or Skip ends it). "ended" lingers briefly after it stops, so the final
// line can show and fade and screen readers hear that control is back; the
// player is already in control by then.
export type GuidedTour =
  | { phase: "touring"; stop: number; callout: boolean; arrived: boolean }
  | { phase: "ended"; completed: boolean };

// How long the "ended" state lingers.
const TOUR_ENDED_MS = 3200;
let tourEndTimer: ReturnType<typeof setTimeout> | undefined;

type WorldState = {
  // Target (zone, project pedestal, crystal, milestone…) the player can open now.
  nearby: Target | null;
  // Target whose panel is open.
  active: Target | null;
  // Zones whose content has been opened at least once.
  visited: ZoneId[];
  // The latest first-time discovery, for the HUD's brief announcement. Zones
  // restored from an earlier visit don't count as discoveries.
  discovery: Discovery | null;
  menuOpen: boolean;
  // Full HTML view of the portfolio (also the no-WebGL fallback).
  pageView: boolean;
  // False when WebGL is unavailable: the HTML view is then the only view.
  worldAvailable: boolean;
  // Diorama vista requested from the menu; ends on movement or Escape.
  vistaRequested: boolean;
  // One-shot teleport request consumed by the player controller.
  teleport: [number, number] | null;
  // True while the fast-travel veil covers the screen.
  travelling: boolean;
  // True once the 3D world has rendered its first frame.
  worldReady: boolean;
  guidedTour: GuidedTour | null;

  setNearby: (target: Target | null) => void;
  open: (target: Target) => void;
  restoreVisited: (zones: ZoneId[]) => void;
  close: () => void;
  setMenuOpen: (open: boolean) => void;
  setPageView: (open: boolean) => void;
  disableWorld: () => void;
  showVista: () => void;
  dismissVista: () => void;
  travelTo: (zone: ZoneId) => void;
  clearTeleport: () => void;
  setWorldReady: () => void;
  startTour: () => void;
  setTourStop: (stop: number, callout: boolean, arrived: boolean) => void;
  endTour: (completed: boolean) => void;
};

// Anything that changes what the visitor is doing ends a running tour.
const endingTour = (s: { guidedTour: GuidedTour | null }) => (s.guidedTour?.phase === "touring" ? endedTour(false) : {});
function endedTour(completed: boolean): { guidedTour: GuidedTour } {
  clearTimeout(tourEndTimer);
  tourEndTimer = setTimeout(() => useWorldStore.setState({ guidedTour: null }), TOUR_ENDED_MS);
  return { guidedTour: { phase: "ended", completed } };
}

export const useWorldStore = create<WorldState>((set) => ({
  nearby: null,
  active: null,
  visited: [],
  discovery: null,
  menuOpen: false,
  pageView: false,
  worldAvailable: true,
  vistaRequested: false,
  teleport: null,
  travelling: false,
  worldReady: false,
  guidedTour: null,

  // Only replace on a real change, so subscribers don't re-render every frame.
  setNearby: (target) => set((s) => (sameTarget(s.nearby, target) || s.nearby === target ? s : { nearby: target })),
  open: (target) =>
    set((s) => {
      const zone = zoneOf(target);
      if (!zone || s.visited.includes(zone)) return { active: target, menuOpen: false, ...endingTour(s) };
      const visited = [...s.visited, zone];
      return { active: target, menuOpen: false, visited, discovery: { zone, count: visited.length }, ...endingTour(s) };
    }),
  restoreVisited: (zones) => set((s) => ({ visited: [...new Set([...s.visited, ...zones])] })),
  close: () => set({ active: null }),
  setMenuOpen: (menuOpen) => set((s) => ({ menuOpen, ...(menuOpen ? endingTour(s) : {}) })),
  setPageView: (pageView) => set((s) => ({ pageView, menuOpen: false, active: null, ...endingTour(s) })),
  disableWorld: () => set((s) => ({ worldAvailable: false, pageView: true, menuOpen: false, active: null, ...endingTour(s) })),
  showVista: () => set((s) => ({ vistaRequested: true, menuOpen: false, active: null, ...endingTour(s) })),
  dismissVista: () => set({ vistaRequested: false }),
  travelTo: (zone) => {
    const { position, radius } = ZONE_BY_ID[zone];
    // Arrive inside the ring near its south edge, clear of the landmark itself.
    const arrival: [number, number] = [position[0], position[1] + radius - 0.3];
    // Fade a veil in, jump while it covers the screen, then fade it out.
    travelTimers.forEach(clearTimeout);
    set((s) => ({ travelling: true, menuOpen: false, active: null, ...endingTour(s) }));
    travelTimers = [
      setTimeout(() => set({ teleport: arrival }), TRAVEL_VEIL_MS),
      setTimeout(() => set({ travelling: false }), TRAVEL_VEIL_MS * 2),
    ];
  },
  clearTeleport: () => set({ teleport: null }),
  setWorldReady: () => set({ worldReady: true }),
  // From the menu: everything else closes and the robot takes over. Not while
  // the world is unavailable, covered or mid fast travel.
  startTour: () => {
    const s = useWorldStore.getState();
    if (!s.worldAvailable || !s.worldReady || s.pageView || s.travelling) return;
    clearTimeout(tourEndTimer);
    travelTimers.forEach(clearTimeout);
    // The tour starts at the plaza: if the robot is elsewhere, it is carried
    // there under the fast-travel veil rather than walking across the world.
    const [sx, , sz] = PLAYER.spawn;
    const away = Math.hypot(runtime.player.position.x - sx, runtime.player.position.z - sz) > 1.5;
    set({ guidedTour: { phase: "touring", stop: 0, callout: true, arrived: false }, menuOpen: false, active: null, vistaRequested: false, travelling: away });
    if (away) {
      travelTimers = [
        setTimeout(() => set({ teleport: [sx, sz] }), TRAVEL_VEIL_MS),
        setTimeout(() => set({ travelling: false }), TRAVEL_VEIL_MS * 2),
      ];
    }
  },
  setTourStop: (stop, callout, arrived) =>
    set((s) => {
      const t = s.guidedTour;
      if (t?.phase !== "touring" || (t.stop === stop && t.callout === callout && t.arrived === arrived)) return s;
      return { guidedTour: { phase: "touring", stop, callout, arrived } };
    }),
  endTour: (completed) => set((s) => (s.guidedTour?.phase === "touring" ? endedTour(completed) : s)),
}));

export const isTouring = () => useWorldStore.getState().guidedTour?.phase === "touring";

// True while a UI layer owns the keyboard, or the tour is driving: the
// player's own movement input is ignored.
export function isInputLocked() {
  const { active, menuOpen, pageView, guidedTour } = useWorldStore.getState();
  return active !== null || menuOpen || pageView || guidedTour?.phase === "touring";
}
