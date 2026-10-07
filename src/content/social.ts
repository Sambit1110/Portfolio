// Ways to reach me, shown at the lighthouse and on the HTML page only.

export type SocialLink = {
  id: "github" | "linkedin" | "email";
  label: string;
  // What the visitor sees for the link.
  display: string;
  href: string;
};

export const EMAIL = "sambitbiswas1110@gmail.com";

export const SOCIAL_LINKS: SocialLink[] = [
  { id: "github", label: "GitHub", display: "github.com/Sambit1110", href: "https://github.com/Sambit1110" },
  {
    id: "linkedin",
    label: "LinkedIn",
    display: "linkedin.com/in/sambit-biswas",
    href: "https://www.linkedin.com/in/sambit-biswas-927a6732b/",
  },
  { id: "email", label: "Email", display: EMAIL, href: `mailto:${EMAIL}` },
];
