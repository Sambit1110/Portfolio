"use client";

import { useEffect, useRef, useState } from "react";
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
import { LIST_BATCH, useProjectCollection, useProjectListMemory } from "@/components/content/ProjectCollection";
import { repositoryCategory } from "@/lib/github/repositories";
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

// One row of the Projects list.
function ProjectRow({ number, name, detail, onOpen }: { number: number; name: string; detail: string; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-sand/40 focus-visible:bg-sand/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-ink"
      >
        <span className="mt-0.5 font-semibold text-cyan-ink tabular-nums">{String(number).padStart(2, "0")}</span>
        <span className="min-w-0">
          <span className="block font-semibold break-words group-hover:underline">{name}</span>
          <span className="text-sm text-rock">{detail}</span>
        </span>
      </button>
    </li>
  );
}

// Curated projects first (each on a pedestal), then the portfolio's own
// starred GitHub repositories, most recently starred first, in the same list.
// The list scrolls on its own under the panel's header, and shows repositories
// a batch at a time: "Show more" appends the next batch from data already on
// the page (no further request).
export function ProjectsPanel() {
  const open = useWorldStore((s) => s.open);
  const { repositories, unavailable } = useProjectCollection();
  const { shown: remembered, setShown, scrollTopRef } = useProjectListMemory();
  const shown = Math.min(remembered, repositories.length);
  const total = PROJECTS.length + repositories.length;
  const scroller = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  // Row to move focus to once a new batch has rendered.
  const focusRow = useRef<number | null>(null);

  // Back from a project: the list is where it was left.
  useEffect(() => {
    scroller.current?.scrollTo({ top: scrollTopRef.current });
  }, [scrollTopRef]);

  useEffect(() => {
    if (focusRow.current === null) return;
    const row = list.current?.children[focusRow.current]?.querySelector("button");
    focusRow.current = null;
    row?.focus({ preventScroll: true });
    row?.scrollIntoView({ block: "nearest" });
  }, [shown]);

  const showMore = () => {
    if (shown >= repositories.length) return;
    // Keyboard and screen-reader users carry on from the first new entry.
    focusRow.current = PROJECTS.length + shown;
    setShown(Math.min(shown + LIST_BATCH, repositories.length));
  };

  return (
    <>
      <PanelHeader eyebrow={ZONE_BY_ID.projects.landmark} title="Projects" />
      <p className="leading-relaxed text-ink/80">
        {repositories.length > 0
          ? "Featured projects stand on pedestals in the workshop. Walk up to one, or pick any project here."
          : "Each project stands on its own pedestal. Walk up to one, or pick it here."}
      </p>
      <div
        ref={scroller}
        onScroll={(event) => (scrollTopRef.current = event.currentTarget.scrollTop)}
        className="-mx-2 mt-4 min-h-28 flex-1 touch-pan-y overscroll-contain overflow-y-auto px-2 pb-1"
      >
        <ol ref={list} className="space-y-1.5">
          {PROJECTS.map((project, i) => (
            <ProjectRow
              key={project.id}
              number={i + 1}
              name={project.name}
              detail={`${project.category}${project.status === "experimental" ? " · Experimental" : ""}`}
              onOpen={() => open({ kind: "project", id: project.id })}
            />
          ))}
          {repositories.slice(0, shown).map((repo, i) => (
            <ProjectRow
              key={repo.url}
              number={PROJECTS.length + i + 1}
              name={repo.name}
              detail={repositoryCategory(repo)}
              onOpen={() => open({ kind: "repository", id: repo.fullName })}
            />
          ))}
        </ol>
        {repositories.length > LIST_BATCH && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-3 pb-2">
            {shown < repositories.length && (
              <button
                type="button"
                onClick={showMore}
                className="touch-manipulation rounded-full border border-ink/15 px-4 py-2 text-sm font-medium transition hover:bg-sand/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-ink pointer-coarse:min-h-11"
              >
                Show {Math.min(LIST_BATCH, repositories.length - shown)} more
              </button>
            )}
            <p aria-live="polite" className="text-sm text-rock">
              {shown < repositories.length ? `Showing ${PROJECTS.length + shown} of ${total} projects` : `All ${total} projects shown`}
            </p>
          </div>
        )}
        {unavailable && <p className="mt-3 px-3 text-sm text-rock">More GitHub repositories can&rsquo;t be loaded right now.</p>}
      </div>
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
