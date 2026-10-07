import { CERTIFICATES } from "@/content/certificates";
import { EDUCATION } from "@/content/education";
import { EXPERIENCE } from "@/content/experience";
import { PROFILE } from "@/content/profile";
import { PROJECTS } from "@/content/projects";
import { SKILL_CATEGORIES } from "@/content/skills";
import { Chips } from "@/components/content/Chips";
import { ContactLinks } from "@/components/content/ContactLinks";
import { CertificateEntry, EducationEntry, ExperienceEntry } from "@/components/content/Entries";
import { ProjectDetails } from "@/components/content/ProjectDetails";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`section-${id}`} className="mt-14 border-t border-rock/15 pt-8">
      <h2 id={`section-${id}`} className="mb-5 text-3xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

// The whole portfolio as semantic HTML, rendered on the server from the same
// content files as the 3D world. It is the accessible path through the site,
// the "View as a page" mode and the fallback when WebGL is unavailable.
export function PortfolioContent() {
  return (
    <main id="portfolio" className="mx-auto max-w-2xl px-6 py-16 text-ink">
      <header>
        <h1 className="text-5xl font-semibold">{PROFILE.name}</h1>
        <p className="mt-2 text-lg font-medium text-cyan-ink">{PROFILE.role}</p>
        <p className="mt-3 text-lg text-rock">{PROFILE.tagline}</p>
      </header>

      <Section id="about" title="About">
        <p className="text-lg leading-relaxed">{PROFILE.intro}</p>
        {PROFILE.about.map((paragraph) => (
          <p key={paragraph} className="mt-4 leading-relaxed text-ink/80">
            {paragraph}
          </p>
        ))}
        <h3 className="mt-6 mb-2.5 font-semibold">Interests</h3>
        <Chips items={PROFILE.interests} label="Interests" />
      </Section>

      <Section id="projects" title="Projects">
        <div className="space-y-10">
          {PROJECTS.map((project) => (
            <article key={project.id} aria-labelledby={`project-${project.id}`}>
              <p className="text-sm font-medium text-rock">{project.category}</p>
              <h3 id={`project-${project.id}`} className="mb-3 text-xl font-semibold">
                {project.name}
              </h3>
              <ProjectDetails project={project} />
            </article>
          ))}
        </div>
      </Section>

      <Section id="skills" title="Skills">
        <div className="space-y-6">
          {SKILL_CATEGORIES.map((category) => (
            <div key={category.id}>
              <h3 className="mb-2.5 font-semibold">{category.name}</h3>
              <Chips items={category.skills} label={`${category.name} skills`} />
            </div>
          ))}
        </div>
      </Section>

      <Section id="experience" title="Experience">
        <div className="space-y-6">
          {EXPERIENCE.map((item) => (
            <ExperienceEntry key={item.id} item={item} />
          ))}
        </div>
      </Section>

      <Section id="education" title="Education">
        <div className="space-y-6">
          {EDUCATION.map((item) => (
            <EducationEntry key={item.id} item={item} />
          ))}
        </div>
      </Section>

      {CERTIFICATES.length > 0 && (
        <Section id="certificates" title="Certificates">
          <div className="space-y-6">
            {CERTIFICATES.map((item) => (
              <CertificateEntry key={item.id} item={item} />
            ))}
          </div>
        </Section>
      )}

      <Section id="contact" title="Contact">
        <ContactLinks />
      </Section>
    </main>
  );
}
