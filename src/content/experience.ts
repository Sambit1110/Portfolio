// Experience along the milestone path, in order. No dates are recorded on
// purpose: add a `period` only when it is real.

export type ExperienceItem = {
  id: string;
  title: string;
  // Short label used in the world and in prompts.
  shortTitle: string;
  role?: string;
  period?: string;
  description: string;
};

export const EXPERIENCE: ExperienceItem[] = [
  {
    id: "sih-2026-tracex",
    title: "Smart India Hackathon 2026 — TraceX",
    shortTitle: "SIH 2026 · TraceX",
    role: "Team Member / Developer",
    description:
      "Worked on an AI-powered email threat detection and forensic intelligence platform combining cybersecurity, AI/ML, threat analysis and full-stack development.",
  },
  {
    id: "independent",
    title: "Independent Development",
    shortTitle: "Independent work",
    description:
      "Building and experimenting with AI/ML applications, full-stack products, developer tools, and interactive web experiences.",
  },
];
