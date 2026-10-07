import type { Certificate } from "@/content/certificates";
import type { Education } from "@/content/education";
import type { ExperienceItem } from "@/content/experience";
import { Chips } from "./Chips";

type HeadingLevel = "h3" | "h4";

type EntryProps<T> = {
  item: T;
  as?: HeadingLevel;
  // Detail panels already show the title as their own heading.
  hideTitle?: boolean;
};

export function ExperienceEntry({ item, as: Heading = "h3", hideTitle }: EntryProps<ExperienceItem>) {
  return (
    <div>
      {!hideTitle && <Heading className="font-semibold">{item.title}</Heading>}
      {(item.role || item.period) && (
        <p className="text-sm text-rock">{[item.role, item.period].filter(Boolean).join(" · ")}</p>
      )}
      <p className="mt-1.5 leading-relaxed text-ink/80">{item.description}</p>
    </div>
  );
}

export function EducationEntry({ item, as: Heading = "h3", hideTitle }: EntryProps<Education>) {
  return (
    <div>
      {!hideTitle && <Heading className="font-semibold">{item.degree}</Heading>}
      <p className="text-sm text-rock">
        {[`Specialization: ${item.specialization}`, item.institution, item.period].filter(Boolean).join(" · ")}
      </p>
      <p className="mt-3 mb-2 text-xs font-semibold tracking-[0.16em] text-rock uppercase">Academic focus</p>
      <Chips items={item.focus} label={`Academic focus for ${item.degree}`} />
    </div>
  );
}

export function CertificateEntry({ item, as: Heading = "h3", hideTitle }: EntryProps<Certificate>) {
  return (
    <div>
      {!hideTitle && <Heading className="font-semibold">{item.name}</Heading>}
      <p className="text-sm text-rock">{[item.issuer, item.date].filter(Boolean).join(" · ")}</p>
      {item.description && <p className="mt-1.5 leading-relaxed text-ink/80">{item.description}</p>}
      {item.credentialId && <p className="mt-1 text-sm text-rock">Credential ID: {item.credentialId}</p>}
    </div>
  );
}
