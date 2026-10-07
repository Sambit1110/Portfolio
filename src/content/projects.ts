// Projects shown in the workshop: one pedestal per entry, in this order.
// Add or remove an entry and the world, panels and HTML page all follow.

export type Project = {
  id: string;
  name: string;
  // Short label used in the world and in prompts.
  shortName: string;
  // One-line category shown above the name.
  category: string;
  description: string;
  technologies: string[];
  status?: "experimental";
};

export const PROJECTS: Project[] = [
  {
    id: "samy",
    name: "SAMY — Offline AI Assistant",
    shortName: "SAMY",
    category: "Local AI · Developer tool",
    description:
      "A privacy-focused terminal AI assistant designed to run locally without relying on cloud inference. SAMY uses local language models and llama.cpp to provide an offline conversational experience while keeping user data on-device.",
    technologies: ["Python", "llama.cpp", "GGUF", "Local LLM inference", "CLI", "AI/ML"],
  },
  {
    id: "hirelabs",
    name: "HireLabs — AI Interview & Resume Evaluation System",
    shortName: "HireLabs",
    category: "AI · Recruitment platform",
    description:
      "An AI-powered recruitment platform that analyzes resumes, extracts skills, evaluates candidate profiles, and supports intelligent interview preparation. It combines NLP, semantic matching, embeddings, and machine learning to help candidates understand their strengths and improve their job readiness.",
    technologies: [
      "Next.js",
      "React",
      "Python",
      "FastAPI",
      "Flask",
      "MongoDB",
      "Supabase",
      "Gemini",
      "Embeddings",
      "Vector Search",
      "TF-IDF",
      "Machine Learning",
    ],
  },
  {
    id: "email-threat-intelligence",
    name: "AI-Powered Email Threat Detection & Forensic Intelligence Platform",
    shortName: "Email Threat Intelligence",
    category: "AI · Cybersecurity",
    description:
      "A cybersecurity platform that analyzes emails to detect phishing and other malicious indicators while extracting useful forensic information. The system combines AI, NLP, threat intelligence, and email analysis to help investigate suspicious messages and understand potential attack patterns.",
    technologies: [
      "AI/ML",
      "Python",
      "NLP",
      "Threat Intelligence",
      "Email Forensics",
      "Supabase",
      "Next.js",
      "React",
      "FastAPI",
      "Cybersecurity",
    ],
  },
  {
    id: "notes-sharing",
    name: "Notes Sharing Platform",
    shortName: "Notes Sharing",
    category: "Web platform · Education",
    description:
      "A web platform designed for students to upload, organize, and share academic notes and study resources. The project focuses on making educational content easier to access and discover through a simple web interface.",
    technologies: ["HTML", "CSS", "JavaScript", "GitHub Pages"],
  },
  {
    id: "mood-music",
    name: "AI Mood-Based Music Recommender",
    shortName: "Mood Music",
    category: "AI · Recommendation",
    description:
      "An experimental recommendation system that uses AI to understand a user's emotional state and suggest music accordingly.",
    technologies: ["AI/ML", "Recommendation Systems", "Emotion Detection"],
    status: "experimental",
  },
];
