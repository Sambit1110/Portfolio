import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { TOUR_STOPS } from "@/lib/tour";
import { useWorldStore } from "@/stores/worldStore";
import { runtime } from "@/stores/runtime";

// Within this of an intermediate waypoint, steer for the next (smooth corners).
const PASS = 1.2;
// Within this of a stop, the robot has arrived; and if it is already this
// close and moving away again (on slow frames it can overshoot), likewise.
const ARRIVE = 0.35;
const OVERSHOOT = 1;
// Ease off over the last stretch before a stop.
const SLOW = 1.8;
// The stop's line appears when the robot is this close (route distance).
const CALLOUT_AT = 6;
// Failsafes: a waypoint with no progress for this long is skipped; a stop that
// takes longer than this is skipped; a tour longer than this simply ends.
const STUCK_S = 2.5;
const STOP_LIMIT_S = 18;
const TOUR_LIMIT_S = 90;

// Route distance still to walk from each waypoint to the stop.
const REMAINING = TOUR_STOPS.map(({ route }) =>
  route.map((_, i) => {
    let d = 0;
    for (let k = i; k < route.length - 1; k++) d += Math.hypot(route[k + 1][0] - route[k][0], route[k + 1][1] - route[k][1]);
    return d;
  }),
);

const fresh = () => ({ running: false, stop: 0, wp: 0, arrived: false, callout: true, dwell: 0, best: Infinity, stuck: 0, stopTime: 0, tourTime: 0 });

// Walks the robot round the guided tour. It only ever sets the autopilot
// target the player controller steers toward, so physics, collisions and the
// walk animation are exactly those of normal play. Ends itself on completion;
// anything the visitor does (see worldStore) ends it sooner.
export function TourDriver() {
  const state = useRef(fresh());

  useFrame((_, delta) => {
    // Real time, so the tour keeps its length on slow devices; capped only so
    // a return to a backgrounded tab doesn't skip a stop.
    const dt = Math.min(delta, 0.25);
    const store = useWorldStore.getState();
    const tour = store.guidedTour;
    const s = state.current;

    if (tour?.phase !== "touring") {
      if (s.running) {
        state.current = fresh();
        runtime.autopilot = null;
      }
      return;
    }
    if (!s.running) s.running = true;
    // Hold still while the start-of-tour veil moves the robot to the plaza.
    if (store.travelling || store.teleport) {
      runtime.autopilot = null;
      return;
    }

    s.tourTime += dt;
    s.stopTime += dt;
    if (s.tourTime > TOUR_LIMIT_S) {
      store.endTour(false);
      return;
    }

    const stop = TOUR_STOPS[s.stop];
    const { x, z } = runtime.player.position;

    if (!s.arrived) {
      const target = stop.route[s.wp];
      const last = s.wp === stop.route.length - 1;
      const d = Math.hypot(target[0] - x, target[1] - z);
      if (d < s.best - 0.05) {
        s.best = d;
        s.stuck = 0;
      } else {
        s.stuck += dt;
      }

      const blocked = s.stuck > STUCK_S;
      const overshot = last && d < OVERSHOOT && d > s.best + 0.12;
      if ((last && d < ARRIVE) || overshot || (last && blocked) || s.stopTime > STOP_LIMIT_S) {
        // Arrived (or, failing that, close enough to move on gracefully).
        s.arrived = true;
        runtime.autopilot = null;
      } else if (!last && (d < PASS || blocked)) {
        s.wp++;
        s.best = Infinity;
        s.stuck = 0;
      } else {
        runtime.autopilot = { x: target[0], z: target[1], throttle: last ? Math.min(Math.max(d / SLOW, 0.3), 1) : 1 };
      }
      // Once a stop's line appears it stays until the robot moves on.
      const next = stop.route[s.wp];
      s.callout ||= s.arrived || Math.hypot(next[0] - x, next[1] - z) + REMAINING[s.stop][s.wp] < CALLOUT_AT;
    } else {
      runtime.autopilot = null;
      s.dwell += dt;
      if (s.dwell >= stop.dwell) {
        if (s.stop === TOUR_STOPS.length - 1) {
          store.endTour(true);
          return;
        }
        Object.assign(s, { stop: s.stop + 1, wp: 0, arrived: false, callout: false, dwell: 0, best: Infinity, stuck: 0, stopTime: 0 });
      }
    }

    store.setTourStop(s.stop, s.callout, s.arrived);
  });

  return null;
}
