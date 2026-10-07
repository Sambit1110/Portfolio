// Education, shown as a milestone on the experience path. No dates on purpose.

export type Education = {
  id: string;
  degree: string;
  // Short label used in the world and in prompts.
  shortTitle: string;
  specialization: string;
  institution: string;
  period?: string;
  focus: string[];
};

export const EDUCATION: Education[] = [
  {
    id: "btech-cse-aiml",
    degree: "B.Tech in Computer Science & Engineering",
    shortTitle: "B.Tech · CSE (AI & ML)",
    specialization: "Artificial Intelligence & Machine Learning",
    institution: "Adamas University",
    focus: [
      "AI / ML",
      "Data Structures & Algorithms",
      "DBMS",
      "Software Engineering",
      "Computer Networks",
      "Formal Languages & Automata",
    ],
  },
];
