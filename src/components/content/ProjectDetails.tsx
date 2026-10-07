import type { Project } from "@/content/projects";
import { Chips } from "./Chips";

// Description and technologies for one project. The caller renders the name as
// a heading at the right level for its context.
export function ProjectDetails({ project }: { project: Project }) {
  return (
    <div className="space-y-4">
      {project.status === "experimental" && (
        <p className="inline-block rounded-full bg-amber/20 px-2.5 py-1 text-xs font-semibold tracking-wide text-ink/80 uppercase">
          Experimental
        </p>
      )}
      <p className="leading-relaxed text-ink/80">{project.description}</p>
      <div>
        <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-rock uppercase">Built with</p>
        <Chips items={project.technologies} label={`Technologies used in ${project.name}`} />
      </div>
    </div>
  );
}
