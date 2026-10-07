import { create } from "zustand";
import { ZONE_BY_ID, type ZoneId } from "@/content/zones";
import { sameTarget, zoneOf, type Target } from "@/lib/interactables";

// Fade time of the fast-travel veil, each way.
export const TRAVEL_VEIL_MS = 220;

// Pending fast-travel steps. A new trip cancels them, so a quick second trip
// can't lift the veil before its own jump.
let travelTimers: ReturnType<typeof setTimeout>[] = [];

type WorldState = {
  // Target (zone, project pedestal, crystal, milestone…) the player can open now.
  nearby: Target | null;
  // Target whose panel is open.
  active: Target | null;
  // Zones whose content has been opened at least once.
  visited: ZoneId[];
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

  setNearby: (target: Target | null) => void;
  open: (target: Target) => void;
  close: () => void;
  setMenuOpen: (open: boolean) => void;
  setPageView: (open: boolean) => void;
  disableWorld: () => void;
  showVista: () => void;
  dismissVista: () => void;
  travelTo: (zone: ZoneId) => void;
  clearTeleport: () => void;
  setWorldReady: () => void;
};

export const useWorldStore = create<WorldState>((set) => ({
  nearby: null,
  active: null,
  visited: [],
  menuOpen: false,
  pageView: false,
  worldAvailable: true,
  vistaRequested: false,
  teleport: null,
  travelling: false,
  worldReady: false,

  // Only replace on a real change, so subscribers don't re-render every frame.
  setNearby: (target) => set((s) => (sameTarget(s.nearby, target) || s.nearby === target ? s : { nearby: target })),
  open: (target) =>
    set((s) => {
      const zone = zoneOf(target);
      return {
        active: target,
        menuOpen: false,
        visited: zone && !s.visited.includes(zone) ? [...s.visited, zone] : s.visited,
      };
    }),
  close: () => set({ active: null }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setPageView: (pageView) => set({ pageView, menuOpen: false, active: null }),
  disableWorld: () => set({ worldAvailable: false, pageView: true, menuOpen: false, active: null }),
  showVista: () => set({ vistaRequested: true, menuOpen: false, active: null }),
  dismissVista: () => set({ vistaRequested: false }),
  travelTo: (zone) => {
    const { position, radius } = ZONE_BY_ID[zone];
    // Arrive inside the ring near its south edge, clear of the landmark itself.
    const arrival: [number, number] = [position[0], position[1] + radius - 0.3];
    // Fade a veil in, jump while it covers the screen, then fade it out.
    travelTimers.forEach(clearTimeout);
    set({ travelling: true, menuOpen: false, active: null });
    travelTimers = [
      setTimeout(() => set({ teleport: arrival }), TRAVEL_VEIL_MS),
      setTimeout(() => set({ travelling: false }), TRAVEL_VEIL_MS * 2),
    ];
  },
  clearTeleport: () => set({ teleport: null }),
  setWorldReady: () => set({ worldReady: true }),
}));

// True while a UI layer owns the keyboard and the player should stand still.
export function isInputLocked() {
  const { active, menuOpen, pageView } = useWorldStore.getState();
  return active !== null || menuOpen || pageView;
}
