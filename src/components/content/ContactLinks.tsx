import { SOCIAL_LINKS } from "@/content/social";

// Contact links as a plain definition-style list. External links open in a new
// tab; email uses mailto.
export function ContactLinks() {
  return (
    <ul className="space-y-2">
      {SOCIAL_LINKS.map((link) => (
        <li key={link.id} className="flex flex-wrap items-baseline gap-x-3">
          <span className="w-20 text-sm text-rock">{link.label}</span>
          <a
            href={link.href}
            {...(link.id === "email" ? {} : { target: "_blank", rel: "noopener noreferrer" })}
            className="font-medium text-cyan-ink underline decoration-cyan-ink/30 underline-offset-4 hover:decoration-cyan-ink"
          >
            {link.display}
          </a>
        </li>
      ))}
    </ul>
  );
}
