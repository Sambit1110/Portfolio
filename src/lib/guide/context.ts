// Turns the typed content files into plain text the model can read. This is the
// only description of the portfolio the model ever sees, and it is generated,
// never hand-written, so it always matches what the site shows.

import { CERTIFICATES } from "@/content/certificates";
import { EDUCATION } from "@/content/education";
import { EXPERIENCE } from "@/content/experience";
import { PROFILE } from "@/content/profile";
import { PROJECTS } from "@/content/projects";
import { SKILL_CATEGORIES } from "@/content/skills";
import { SOCIAL_LINKS } from "@/content/social";

const list = (items: string[]) => items.map((item) => `- ${item}`).join("\n");

export function buildPortfolioContext() {
  const sections = [
    `# Profile
Name: ${PROFILE.name}
Role: ${PROFILE.role}
Tagline: ${PROFILE.tagline}
Introduction (written by ${PROFILE.name} in the first person): ${PROFILE.intro}
${PROFILE.about.map((p) => `More about him (first person): ${p}`).join("\n")}
Interests:
${list(PROFILE.interests)}`,

    `# Projects (${PROJECTS.length})
${PROJECTS.map(
  (p) => `## ${p.name}
Short name: ${p.shortName}
Category: ${p.category}${p.status === "experimental" ? "\nStatus: experimental" : ""}
Description: ${p.description}
Technologies: ${p.technologies.join(", ")}`,
).join("\n\n")}`,

    `# Skills
${SKILL_CATEGORIES.map((c) => `${c.name}: ${c.skills.join(", ")}`).join("\n")}`,

    `# Experience
${EXPERIENCE.map(
  (e) => `## ${e.title}${e.role ? `\nRole: ${e.role}` : ""}${e.period ? `\nPeriod: ${e.period}` : "\nPeriod: not stated"}
Description: ${e.description}`,
).join("\n\n")}`,

    `# Education
${EDUCATION.map(
  (e) => `## ${e.degree}
Specialization: ${e.specialization}
Institution: ${e.institution}${e.period ? `\nPeriod: ${e.period}` : "\nPeriod: not stated"}
Academic focus: ${e.focus.join(", ")}`,
).join("\n\n")}`,

    `# Certificates
${
  CERTIFICATES.length === 0
    ? "None listed in the portfolio yet."
    : CERTIFICATES.map(
        (c) =>
          `## ${c.name}\nIssuer: ${c.issuer}${c.date ? `\nDate: ${c.date}` : ""}${c.credentialId ? `\nCredential ID: ${c.credentialId}` : ""}${c.description ? `\nDescription: ${c.description}` : ""}`,
      ).join("\n\n")
}`,

    `# Contact (the only contact details that exist)
${SOCIAL_LINKS.map((l) => `${l.label}: ${l.id === "email" ? l.display : l.href}`).join("\n")}`,
  ];

  return sections.join("\n\n");
}
