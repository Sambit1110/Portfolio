// Skills, grouped into categories. Each category grows one crystal node in the
// garden, sized by how many skills it holds.

export type SkillCategory = {
  id: string;
  name: string;
  skills: string[];
};

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: "ai-ml",
    name: "AI / ML",
    skills: ["Machine Learning", "Deep Learning", "NLP", "Generative AI", "LLMs", "RAG", "Embeddings", "Vector Search"],
  },
  { id: "programming", name: "Programming", skills: ["Python", "C++", "Java", "JavaScript", "TypeScript", "SQL"] },
  {
    id: "development",
    name: "Development",
    skills: ["React", "Next.js", "Node.js", "FastAPI", "Flask", "Tailwind CSS", "REST APIs"],
  },
  { id: "data-backend", name: "Data / Backend", skills: ["MongoDB", "PostgreSQL", "Supabase", "pgvector"] },
  {
    id: "tools",
    name: "Tools / Platforms",
    skills: ["Git", "GitHub", "Vercel", "Docker", "Gemini", "llama.cpp"],
  },
  { id: "interactive", name: "3D / Interactive", skills: ["Three.js", "React Three Fiber", "GSAP", "Framer Motion"] },
];
