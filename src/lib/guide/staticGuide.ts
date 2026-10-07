import { EDUCATION } from "@/content/education";
import { EXPERIENCE } from "@/content/experience";
import { PROFILE } from "@/content/profile";
import { PROJECTS, type Project } from "@/content/projects";
import { SKILL_CATEGORIES } from "@/content/skills";
import { SOCIAL_LINKS } from "@/content/social";
import type { GuideAnswer } from "./types";

// Offline fallback: answers common questions straight from the content files
// when the live guide is unavailable. It never generates new facts.

const NAME = PROFILE.name.split(" ")[0];
const words = (s: string): string[] => s.toLowerCase().match(/[a-z0-9+#.]+/g) ?? [];

// A question about one project: by its short name, or "… project" plus a
// distinctive word from its category or technologies (e.g. "cybersecurity").
function findProject(question: string): Project | undefined {
  const q = words(question);
  const byName = PROJECTS.find((p) => words(p.shortName).every((w) => q.includes(w)));
  if (byName || !q.some((w) => w.startsWith("project"))) return byName;
  return PROJECTS.find((p) =>
    [...words(p.category), ...p.technologies.flatMap(words)].some((w) => w.length > 4 && q.includes(w)),
  );
}

const projectAnswer = (p: Project): GuideAnswer => ({
  text: `${p.name} (${p.category}${p.status === "experimental" ? ", experimental" : ""}). ${p.description}`,
  items: [`Built with: ${p.technologies.join(", ")}`],
});

const TOPICS: { match: RegExp; answer: () => GuideAnswer }[] = [
  {
    match: /project|built|build|made/i,
    answer: () => ({
      text: `${NAME} has ${PROJECTS.length} projects in the workshop:`,
      items: PROJECTS.map((p) => `${p.name} · ${p.category}${p.status === "experimental" ? " (experimental)" : ""}`),
    }),
  },
  {
    match: /skill|stack|tech|language|tool/i,
    answer: () => ({
      text: "His skills, grouped as they grow in the crystal garden:",
      items: SKILL_CATEGORIES.map((c) => `${c.name}: ${c.skills.join(", ")}`),
    }),
  },
  {
    match: /experience|hackathon|worked|work/i,
    answer: () => ({
      text: "Along the milestone path:",
      items: EXPERIENCE.map((e) => `${e.title}${e.role ? ` (${e.role})` : ""}: ${e.description}`),
    }),
  },
  {
    match: /stud|education|background|university|degree|who/i,
    // Spoken in the third person, so it doesn't reuse the first-person intro.
    answer: () => ({
      text: `${NAME} is ${/^[aeiou]/i.test(PROFILE.role) ? "an" : "a"} ${PROFILE.role}. He is studying:`,
      items: EDUCATION.map((e) => `${e.degree}, specializing in ${e.specialization}, at ${e.institution}`),
    }),
  },
  {
    match: /contact|reach|email|hire|connect/i,
    answer: () => ({
      text: "You can reach him through the lighthouse, or directly:",
      items: SOCIAL_LINKS.map((l) => `${l.label}: ${l.display}`),
    }),
  },
];

const UNKNOWN: GuideAnswer = {
  text: "I can only answer common portfolio questions right now. Try asking about his projects, skills, experience, background or contact details.",
};

export function staticAnswer(question: string): GuideAnswer {
  const project = findProject(question);
  if (project) return projectAnswer(project);
  return TOPICS.find((t) => t.match.test(question))?.answer() ?? UNKNOWN;
}
