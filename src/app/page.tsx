import { ExperienceLoader } from "@/components/3d/ExperienceLoader";
import { ContentLayer } from "@/components/ui/ContentLayer";
import { Hud } from "@/components/ui/Hud";
import { LoadVeil } from "@/components/ui/LoadVeil";
import { PortfolioContent } from "@/components/ui/PortfolioContent";
import { TravelVeil } from "@/components/ui/TravelVeil";
import { Vignette } from "@/components/ui/Vignette";
import { ProjectCollectionProvider } from "@/components/content/ProjectCollection";
import { collectProjects } from "@/lib/github/repositories";
import { fetchStarred } from "@/lib/github/starred";

// The page is static, regenerated in the background at most every 30 minutes
// so newly starred GitHub repositories join the Projects section. Visitors are
// always served a finished page and never wait on GitHub. Keep in step with
// REVALIDATE_S in src/lib/github/starred.ts.
export const revalidate = 1800;

export default async function Home() {
  const projects = collectProjects(await fetchStarred());
  return (
    <>
      <div className="fixed inset-0">
        <ExperienceLoader />
      </div>
      <Vignette />
      <TravelVeil />
      <LoadVeil />
      <ProjectCollectionProvider value={projects}>
        <Hud />
        <ContentLayer>
          <PortfolioContent curated={projects.curated} />
        </ContentLayer>
      </ProjectCollectionProvider>
      {/* Without JavaScript the world can't run, so show the HTML portfolio. */}
      <noscript>
        <style>{`#content-layer{position:fixed;inset:0;z-index:20;width:auto;height:auto;margin:0;overflow:auto;clip-path:none;white-space:normal;background:var(--cream)}`}</style>
      </noscript>
    </>
  );
}
