"use client";

import { useEffect, useRef, useState } from "react";
import { sameTarget, targetKey, type Target } from "@/lib/interactables";
import { useWorldStore } from "@/stores/worldStore";
import { AICorePanel } from "./AICorePanel";
import { CertificatePanel, MilestonePanel, ProjectPanel, SkillPanel } from "./DetailPanels";
import { AboutPanel, ContactPanel, ExperiencePanel, ProjectsPanel, SkillsPanel } from "./ZonePanels";

function PanelBody({ target }: { target: Target }) {
  switch (target.kind) {
    case "project":
      return <ProjectPanel id={target.id} />;
    case "skill":
      return <SkillPanel id={target.id} />;
    case "milestone":
      return <MilestonePanel id={target.id} />;
    case "certificate":
      return <CertificatePanel id={target.id} />;
    case "zone":
      switch (target.id) {
        case "ai":
          return <AICorePanel />;
        case "projects":
          return <ProjectsPanel />;
        case "skills":
          return <SkillsPanel />;
        case "experience":
          return <ExperiencePanel />;
        case "about":
          return <AboutPanel />;
        case "contact":
          return <ContactPanel />;
      }
  }
  return null;
}

// Side panel for whatever is open. The shell, focus handling and Escape-to-close
// are shared; each target type renders its own body.
// How long the panel takes to slide out; content stays rendered until then.
const EXIT_MS = 320;

export function ContentPanel() {
  const active = useWorldStore((s) => s.active);
  const close = useWorldStore((s) => s.close);
  const panel = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  // The last opened target stays rendered while the panel slides out, so the
  // exit animates real content rather than an empty shell.
  const [shown, setShown] = useState<Target | null>(null);
  if (active && !sameTarget(active, shown)) setShown(active);
  useEffect(() => {
    if (active) return;
    const timer = setTimeout(() => setShown(null), EXIT_MS);
    return () => clearTimeout(timer);
  }, [active]);

  const target = active ?? shown;
  const key = active ? targetKey(active) : null;

  // When a new target opens, start at the top and move focus in: to the panel's
  // primary input if it has one (the AI Core), otherwise to its heading. On
  // touch screens always the heading: focusing an input there would summon the
  // keyboard over half the screen before the visitor chose to type.
  useEffect(() => {
    if (!key) return;
    scroller.current?.scrollTo({ top: 0 });
    const touch = window.matchMedia("(pointer: coarse)").matches;
    const focusTarget =
      (touch ? null : panel.current?.querySelector<HTMLElement>("[data-autofocus]")) ??
      panel.current?.querySelector<HTMLElement>("[data-panel-heading]");
    focusTarget?.focus({ preventScroll: true });
  }, [key]);

  const back = () => {
    close();
    // Hand the keyboard back to the world.
    (document.activeElement as HTMLElement | null)?.blur();
  };

  return (
    <aside
      ref={panel}
      role="dialog"
      aria-modal="false"
      aria-labelledby="panel-title"
      aria-hidden={!active}
      data-target={target ? targetKey(target) : undefined}
      // While closing, the panel can't take focus or clicks.
      inert={!active}
      className={`content-panel flex flex-col rounded-3xl bg-cream/95 text-ink shadow-[0_20px_60px_rgba(47,38,56,0.25)] backdrop-blur-md transition-[opacity,translate,scale] ${
        active
          ? "translate-0 scale-100 opacity-100 duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          : "pointer-events-none scale-[0.985] opacity-0 duration-300 ease-[cubic-bezier(0.4,0,1,1)] max-sm:translate-y-8 sm:translate-x-6"
      }`}
    >
      {target && (
        <>
          <div className="h-1.5 shrink-0 rounded-t-3xl bg-gradient-to-r from-cyan via-cyan/60 to-transparent" />
          <div ref={scroller} className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-7 pt-6 pb-6 max-sm:px-5 max-sm:pt-5">
            {/* Keyed per target, so each opening replays the staggered reveal. */}
            <div key={targetKey(target)} className="panel-stagger">
              <PanelBody target={target} />
            </div>
          </div>
          <div className="panel-footer flex shrink-0 items-center justify-between border-t border-rock/10 px-7 py-4 text-sm text-rock max-sm:px-5 max-sm:py-3 pointer-coarse:justify-end">
            {/* No Escape key on touch screens: the button alone says it. */}
            <span className="pointer-coarse:hidden">
              <kbd className="rounded-md bg-ink/10 px-1.5 py-0.5 font-semibold">Esc</kbd> to return
            </span>
            <button
              type="button"
              onClick={back}
              className="touch-manipulation rounded-full bg-ink px-4 py-2 font-medium text-cream transition hover:bg-rock focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-ink pointer-coarse:min-h-11 pointer-coarse:px-5"
            >
              Back to the world
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
