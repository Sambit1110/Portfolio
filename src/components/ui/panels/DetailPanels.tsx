"use client";

import { CERTIFICATES } from "@/content/certificates";
import { PROJECTS } from "@/content/projects";
import { SKILL_CATEGORIES } from "@/content/skills";
import { Chips } from "@/components/content/Chips";
import { CertificateEntry, EducationEntry, ExperienceEntry } from "@/components/content/Entries";
import { ProjectDetails } from "@/components/content/ProjectDetails";
import { MILESTONES } from "@/lib/placements";
import { PanelHeader } from "./PanelHeader";

// Panels for single objects in the world: a pedestal, crystal, milestone or frame.

export function ProjectPanel({ id }: { id: string }) {
  const project = PROJECTS.find((p) => p.id === id);
  if (!project) return null;
  return (
    <>
      <PanelHeader
        eyebrow={project.category}
        title={project.name}
        back={{ label: "All projects", target: { kind: "zone", id: "projects" } }}
      />
      <ProjectDetails project={project} />
    </>
  );
}

export function SkillPanel({ id }: { id: string }) {
  const category = SKILL_CATEGORIES.find((c) => c.id === id);
  if (!category) return null;
  return (
    <>
      <PanelHeader
        eyebrow={`Skill crystal · ${category.skills.length} skills`}
        title={category.name}
        back={{ label: "All skills", target: { kind: "zone", id: "skills" } }}
      />
      <Chips items={category.skills} label={`${category.name} skills`} />
    </>
  );
}

export function MilestonePanel({ id }: { id: string }) {
  const milestone = MILESTONES.find((m) => m.id === id);
  if (!milestone) return null;
  const back = { label: "The whole path", target: { kind: "zone" as const, id: "experience" } };
  return milestone.type === "experience" ? (
    <>
      <PanelHeader eyebrow="Milestone" title={milestone.item.title} back={back} />
      <ExperienceEntry item={milestone.item} hideTitle />
    </>
  ) : (
    <>
      <PanelHeader eyebrow="Education" title={milestone.item.degree} back={back} />
      <EducationEntry item={milestone.item} hideTitle />
    </>
  );
}

export function CertificatePanel({ id }: { id: string }) {
  const certificate = CERTIFICATES.find((c) => c.id === id);
  if (!certificate) return null;
  return (
    <>
      <PanelHeader
        eyebrow="Certificate"
        title={certificate.name}
        back={{ label: "The whole path", target: { kind: "zone", id: "experience" } }}
      />
      <CertificateEntry item={certificate} hideTitle />
    </>
  );
}
