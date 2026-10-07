// World zones: where each landmark is and how its interaction reads. This is
// world metadata only; portfolio content lives in the other content files.

export type ZoneId = "ai" | "projects" | "skills" | "experience" | "about" | "contact";

export type Zone = {
  id: ZoneId;
  title: string;
  landmark: string;
  // Verb phrase for the interaction prompt ("Press E to …").
  action: string;
  // Centre of the interaction ring; the player activates the zone inside `radius`.
  position: [number, number];
  radius: number;
};

export const ZONES: Zone[] = [
  {
    id: "ai",
    title: "AI Core",
    landmark: "Plaza terminal",
    action: "Wake the AI Core",
    position: [0, -3.2],
    radius: 3,
  },
  {
    id: "projects",
    title: "Projects",
    landmark: "Research workshop",
    action: "Enter the workshop",
    position: [0, -21],
    // Wide enough to hold the arc of project pedestals.
    radius: 5.8,
  },
  {
    id: "skills",
    title: "Skills",
    landmark: "Crystal garden",
    action: "Touch the crystals",
    position: [-25, 0],
    radius: 5,
  },
  {
    id: "experience",
    title: "Experience",
    landmark: "Milestone path",
    action: "Walk the milestones",
    position: [24, 0],
    radius: 5,
  },
  {
    id: "about",
    title: "About",
    landmark: "Campsite",
    action: "Sit by the fire",
    position: [0, 16.5],
    radius: 4.4,
  },
  {
    id: "contact",
    title: "Contact",
    landmark: "Lighthouse",
    action: "Send a signal",
    position: [1.5, 29.5],
    radius: 4,
  },
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z])) as Record<ZoneId, Zone>;
