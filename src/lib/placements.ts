// Where content lives in the world. Every count here comes from the content
// files, so adding a project, skill category, experience or certificate adds
// its pedestal, crystal, milestone or frame automatically.

import { CERTIFICATES, type Certificate } from "@/content/certificates";
import { EDUCATION, type Education } from "@/content/education";
import { EXPERIENCE, type ExperienceItem } from "@/content/experience";
import { PROJECTS, type Project } from "@/content/projects";
import { SKILL_CATEGORIES, type SkillCategory } from "@/content/skills";
import { ZONE_BY_ID } from "@/content/zones";
import { PATHS, pointOnCurve, type Point } from "@/lib/paths";

// Evenly spread `count` values across [from, to].
function spread(count: number, from: number, to: number) {
  if (count === 1) return [(from + to) / 2];
  return Array.from({ length: count }, (_, i) => from + ((to - from) * i) / (count - 1));
}

// Projects: a shallow arc in front of the workshop, bowing toward it at the ends.
const PEDESTAL_SPACING = 2.4;
export type Pedestal = { project: Project; index: number; position: Point };
export const PEDESTALS: Pedestal[] = PROJECTS.map((project, index) => {
  const x = (index - (PROJECTS.length - 1) / 2) * PEDESTAL_SPACING;
  return { project, index, position: [x, -20.4 - 0.11 * x * x] };
});

// Skills: one crystal node per category in a ring around the central cluster,
// offset half a step so no node lands on the path coming in from the east.
export const SKILL_NODE_RADIUS = 3.3;
export type SkillNode = { category: SkillCategory; position: Point; angle: number };
export const SKILL_NODES: SkillNode[] = SKILL_CATEGORIES.map((category, i, all) => {
  const [cx, cz] = ZONE_BY_ID.skills.position;
  const angle = Math.PI / all.length + (i / all.length) * Math.PI * 2;
  return {
    category,
    angle,
    position: [cx + Math.cos(angle) * SKILL_NODE_RADIUS, cz + Math.sin(angle) * SKILL_NODE_RADIUS],
  };
});

// Experience path: milestones (experience, then education) just south of the
// path; certificate frames just north of it.
const MILESTONE_CURVE = PATHS[3];

export type Milestone =
  | { type: "experience"; id: string; item: ExperienceItem; position: Point }
  | { type: "education"; id: string; item: Education; position: Point };

const milestoneEntries = [
  ...EXPERIENCE.map((item) => ({ type: "experience" as const, id: item.id, item })),
  ...EDUCATION.map((item) => ({ type: "education" as const, id: item.id, item })),
];
export const MILESTONES: Milestone[] = milestoneEntries.map((entry, i) => {
  const [x, z] = pointOnCurve(MILESTONE_CURVE, spread(milestoneEntries.length, 0.22, 0.9)[i]);
  return { ...entry, position: [x, z + 1.8] } as Milestone;
});

// One frame per certificate; three blank frames hold the space while empty.
const BLANK_FRAMES = 3;
export type CertificateFrame = { certificate: Certificate | null; position: Point };
const frameCount = CERTIFICATES.length || BLANK_FRAMES;
export const CERTIFICATE_FRAMES: CertificateFrame[] = spread(frameCount, 0.3, 0.84).map((t, i) => {
  const [x, z] = pointOnCurve(MILESTONE_CURVE, t);
  return { certificate: CERTIFICATES[i] ?? null, position: [x, z - 2.3] };
});
