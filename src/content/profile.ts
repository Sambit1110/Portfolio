// Who the portfolio is about. Every surface (world, panels, HTML) reads from here.

export type Profile = {
  name: string;
  role: string;
  tagline: string;
  // Short introduction, shown first.
  intro: string;
  // Longer description, shown below the introduction in the About panel.
  about: string[];
  interests: string[];
};

export const PROFILE: Profile = {
  name: "Sambit Biswas",
  role: "AI/ML Engineer & Full-Stack Developer",
  tagline: "Building intelligent systems and immersive digital experiences.",
  intro:
    "I'm a Computer Science & Engineering student specializing in Artificial Intelligence and Machine Learning. I enjoy building intelligent, practical products that combine AI, software engineering, and creative user experiences.",
  about: [
    "My work sits where AI meets everyday software: machine learning and generative AI on one side, full-stack products, developer tools and interactive web experiences on the other, with a growing interest in cybersecurity.",
  ],
  interests: [
    "Artificial Intelligence",
    "Machine Learning",
    "Generative AI",
    "Cybersecurity",
    "Full-Stack Development",
    "Developer Tools",
    "Interactive Web Experiences",
  ],
};
