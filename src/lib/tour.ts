import { PLAYER } from "@/config/world";
import { ZONE_BY_ID } from "@/content/zones";
import { PATHS, pointOnCurve, type PathCurve, type Point } from "@/lib/paths";

// The guided tour: the robot walks the visitor round the world in about 45
// seconds. Every waypoint comes from the existing world: the worn path curves
// (which the layout already keeps clear of trees, rocks and props), their
// plaza ends (the plaza is open ground), the zone registry and the spawn
// point. Nothing here duplicates a zone's coordinates.

export type TourStop = {
  // Small label above the callout, and the callout line itself.
  label: string;
  text: string;
  // What the camera frames while the robot pauses here.
  focus: Point;
  // Waypoints from the previous stop; the last one is where the robot pauses.
  route: Point[];
  // Seconds to pause on arrival.
  dwell: number;
};

const [NORTH, WEST, EAST, MILESTONES, SOUTH, SHORE] = [PATHS[0], PATHS[1], PATHS[2], PATHS[3], PATHS[4], PATHS[5]];

// Points along a path curve from `from` to `to` (either direction), every ~1.5 units.
function along(curve: PathCurve, from: number, to: number): Point[] {
  const length = Math.hypot(curve.to[0] - curve.from[0], curve.to[1] - curve.from[1]) * Math.abs(to - from);
  const steps = Math.max(1, Math.ceil(length / 1.5));
  return Array.from({ length: steps + 1 }, (_, i) => pointOnCurve(curve, from + ((to - from) * i) / steps));
}

const offset = ([x, z]: Point, dx: number, dz: number): Point => [x + dx, z + dz];

const about = ZONE_BY_ID.about.position;
const ai = ZONE_BY_ID.ai.position;
// Just south of the AI Core's dais, facing its console.
const aiApproach = offset(ai, 0, 3.3);

export const TOUR_STOPS: TourStop[] = [
  {
    label: "Welcome",
    text: "Welcome to my world.",
    focus: ai,
    route: [[PLAYER.spawn[0], PLAYER.spawn[2]]],
    dwell: 2.4,
  },
  {
    label: ZONE_BY_ID.about.title,
    text: "Get to know me beyond the code.",
    focus: about,
    route: along(SOUTH, 0, 1),
    dwell: 2.2,
  },
  {
    label: ZONE_BY_ID.skills.title,
    text: "Tools and technologies I build with.",
    focus: ZONE_BY_ID.skills.position,
    route: [...along(SOUTH, 1, 0), ...along(WEST, 0, 1)],
    dwell: 2.2,
  },
  {
    label: ZONE_BY_ID.projects.title,
    text: "Explore the projects I've built.",
    focus: ZONE_BY_ID.projects.position,
    route: [...along(WEST, 1, 0), ...along(NORTH, 0, 0.75)],
    dwell: 2.6,
  },
  {
    label: ZONE_BY_ID.experience.title,
    text: "Milestones from my engineering journey.",
    focus: ZONE_BY_ID.experience.position,
    route: [...along(NORTH, 0.75, 0), ...along(EAST, 0, 1), ...along(MILESTONES, 0, 0.12)],
    dwell: 2.2,
  },
  {
    label: ZONE_BY_ID.ai.title,
    text: "Ask my AI guide about my work.",
    focus: ai,
    route: [...along(MILESTONES, 0.12, 0), ...along(EAST, 1, 0), aiApproach],
    dwell: 2.4,
  },
  {
    label: ZONE_BY_ID.contact.title,
    text: "Let's build something together.",
    focus: ZONE_BY_ID.contact.position,
    // Round the east side of the campsite, clear of the fire, logs and tent.
    route: [...along(SOUTH, 0, 1), offset(about, 4.6, -2.5), offset(about, 4.6, 2.5), ...along(SHORE, 0.15, 0.9)],
    dwell: 2.2,
  },
];

export const TOUR_OUTRO = "That's my world. Explore freely.";
