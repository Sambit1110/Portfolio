"use client";

import { useState } from "react";
import { CERTIFICATES } from "@/content/certificates";
import { EDUCATION } from "@/content/education";
import { EMAIL } from "@/content/social";
import { EXPERIENCE } from "@/content/experience";
import { PROFILE } from "@/content/profile";
import { PROJECTS } from "@/content/projects";
import { SKILL_CATEGORIES } from "@/content/skills";
import { ZONE_BY_ID } from "@/content/zones";
import { Chips } from "@/components/content/Chips";
import { ContactLinks } from "@/components/content/ContactLinks";
import { CertificateEntry, EducationEntry, ExperienceEntry } from "@/components/content/Entries";
import { useWorldStore } from "@/stores/worldStore";
import { PanelHeader, SectionTitle } from "./PanelHeader";

// Overview panels, one per zone. All copy comes from src/content.

export function AboutPanel() {
  return (
    <>
      <PanelHeader eyebrow={ZONE_BY_ID.about.landmark} title="About" />
      <p className="text-sm font-medium text-rock">{PROFILE.role}</p>
      <p className="mt-3 text-[17px] leading-relaxed">{PROFILE.intro}</p>
      {PROFILE.about.map((paragraph) => (
        <p key={paragraph} className="mt-4 leading-relaxed text-ink/80">
          {paragraph}
        </p>
      ))}
      {EDUCATION.map((e) => (
        <p key={e.id} className="mt-4 leading-relaxed text-ink/80">
          Currently studying for a {e.degree}, specializing in {e.specialization}, at {e.institution}.
        </p>
      ))}
      <SectionTitle>Interests</SectionTitle>
      <Chips items={PROFILE.interests} label="Interests" />
    </>
  );
}

export function ProjectsPanel() {
  const open = useWorldStore((s) => s.open);
  return (
    <>
      <PanelHeader eyebrow={ZONE_BY_ID.projects.landmark} title="Projects" />
      <p className="leading-relaxed text-ink/80">Each project stands on its own pedestal. Walk up to one, or pick it here.</p>
      <ol className="mt-5 space-y-1.5">
        {PROJECTS.map((project, i) => (
          <li key={project.id}>
            <button
              type="button"
              onClick={() => open({ kind: "project", id: project.id })}
              className="group flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-sand/40 focus-visible:bg-sand/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-ink"
            >
              <span className="mt-0.5 font-semibold text-cyan-ink tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span>
                <span className="block font-semibold group-hover:underline">{project.name}</span>
                <span className="text-sm text-rock">
                  {project.category}
                  {project.status === "experimental" && " · Experimental"}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}

export function SkillsPanel() {
  const open = useWorldStore((s) => s.open);
  return (
    <>
      <PanelHeader eyebrow={ZONE_BY_ID.skills.landmark} title="Skills" />
      <p className="leading-relaxed text-ink/80">Every crystal in the garden holds one area of skills.</p>
      {SKILL_CATEGORIES.map((category) => (
        <section key={category.id} aria-labelledby={`skills-${category.id}`} className="mt-6">
          <h3 id={`skills-${category.id}`} className="mb-2.5">
            <button
              type="button"
              onClick={() => open({ kind: "skill", id: category.id })}
              className="font-semibold hover:text-cyan-ink hover:underline focus-visible:outline-2 focus-visible:outline-cyan-ink"
            >
              {category.name}
            </button>
          </h3>
          <Chips items={category.skills} label={`${category.name} skills`} />
        </section>
      ))}
    </>
  );
}

export function ExperiencePanel() {
  return (
    <>
      <PanelHeader eyebrow={ZONE_BY_ID.experience.landmark} title="Experience" />
      <div className="space-y-5">
        {EXPERIENCE.map((item) => (
          <ExperienceEntry key={item.id} item={item} />
        ))}
      </div>
      <SectionTitle>Education</SectionTitle>
      <div className="space-y-5">
        {EDUCATION.map((item) => (
          <EducationEntry key={item.id} item={item} as="h4" />
        ))}
      </div>
      {CERTIFICATES.length > 0 && (
        <>
          <SectionTitle>Certificates</SectionTitle>
          <div className="space-y-5">
            {CERTIFICATES.map((item) => (
              <CertificateEntry key={item.id} item={item} as="h4" />
            ))}
          </div>
        </>
      )}
    </>
  );
}

export function ContactPanel() {
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const copyEmail = async () => {
    try {
      // Throws, rather than rejecting, where the Clipboard API is missing
      // (older browsers, non-secure pages); both land in catch.
      await navigator.clipboard.writeText(EMAIL);
      setCopy("copied");
      setTimeout(() => setCopy((state) => (state === "copied" ? "idle" : state)), 2000);
    } catch {
      setCopy("failed");
    }
  };

  return (
    <>
      <PanelHeader eyebrow={ZONE_BY_ID.contact.landmark} title="Contact" />
      <p className="mb-5 leading-relaxed text-ink/80">Send a signal through any of these.</p>
      <ContactLinks />
      <button
        type="button"
        onClick={copyEmail}
        className="mt-5 rounded-full border border-ink/15 px-4 py-2 text-sm font-medium transition hover:border-cyan-ink hover:text-cyan-ink focus-visible:outline-2 focus-visible:outline-cyan-ink"
      >
        {copy === "copied" ? "Email copied" : "Copy email address"}
      </button>
      <span className="sr-only" aria-live="polite">
        {copy === "copied" ? "Email address copied to clipboard" : ""}
      </span>
      {/* Always present (empty, it takes no space), so screen readers announce it. */}
      <p className="text-sm text-rock" aria-live="polite">
        {copy === "failed" && (
          <span className="mt-2 block">
            Couldn&apos;t copy automatically. The address is <span className="font-medium text-ink select-all">{EMAIL}</span>
          </span>
        )}
      </p>
    </>
  );
}
