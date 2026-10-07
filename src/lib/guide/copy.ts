import { PROFILE } from "@/content/profile";
import { PROJECTS } from "@/content/projects";

// Words the AI Core says before any question. Names come from content, so the
// copy stays correct if the profile or project list changes.
const NAME = PROFILE.name.split(" ")[0];

export const GUIDE_GREETING = [
  "Hello, explorer.",
  `I'm ${NAME}'s AI portfolio guide.`,
  "Ask me about his projects, skills, experience or background.",
];

export const GUIDE_SUGGESTIONS = [
  `What projects has ${NAME} built?`,
  ...(PROJECTS[0] ? [`What is ${PROJECTS[0].shortName}?`] : []),
  `What technologies does ${NAME} use?`,
  // Offered only while the portfolio actually has such a project.
  ...(PROJECTS.some((p) => /cybersecurity/i.test(p.category)) ? ["Tell me about his cybersecurity project."] : []),
  `What is ${NAME}'s background?`,
];
