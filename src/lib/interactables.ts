// Every thing the player can walk up to and open, built from zones and
// content. The tracker, prompt, camera and panels all look targets up here.

import { ZONES, type ZoneId } from "@/content/zones";
import { CERTIFICATE_FRAMES, MILESTONES, PEDESTALS, SKILL_NODES } from "@/lib/placements";
import type { Point } from "@/lib/paths";

export type TargetKind = "zone" | "project" | "skill" | "milestone" | "certificate";
export type Target = { kind: TargetKind; id: string };

export type Interactable = Target & {
  key: string;
  // The zone this target belongs to (for markers, camera and visited dots).
  zone: ZoneId;
  position: Point;
  radius: number;
  // Shown in the "Press E" prompt.
  action: string;
};

export const targetKey = (t: Target) => `${t.kind}:${t.id}`;

const make = (t: Omit<Interactable, "key">): Interactable => ({ ...t, key: targetKey(t) });

export const INTERACTABLES: Interactable[] = [
  ...ZONES.map((z) => make({ kind: "zone", id: z.id, zone: z.id, position: z.position, radius: z.radius, action: z.action })),
  ...PEDESTALS.map((p) =>
    make({ kind: "project", id: p.project.id, zone: "projects", position: p.position, radius: 1.55, action: `View ${p.project.shortName}` }),
  ),
  ...SKILL_NODES.map((n) =>
    make({ kind: "skill", id: n.category.id, zone: "skills", position: n.position, radius: 1.3, action: `Examine ${n.category.name}` }),
  ),
  ...MILESTONES.map((m) =>
    make({ kind: "milestone", id: m.id, zone: "experience", position: m.position, radius: 1.4, action: `Read about ${m.item.shortTitle}` }),
  ),
  ...CERTIFICATE_FRAMES.flatMap((f) =>
    f.certificate
      ? [make({ kind: "certificate", id: f.certificate.id, zone: "experience", position: f.position, radius: 1.5, action: `View ${f.certificate.name}` })]
      : [],
  ),
];

export const INTERACTABLE_BY_KEY = new Map(INTERACTABLES.map((i) => [i.key, i]));

export const zoneOf = (t: Target | null): ZoneId | null => (t ? (INTERACTABLE_BY_KEY.get(targetKey(t))?.zone ?? null) : null);

export const sameTarget = (a: Target | null, b: Target | null) =>
  a !== null && b !== null && a.kind === b.kind && a.id === b.id;
