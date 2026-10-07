import { ExperienceLoader } from "@/components/3d/ExperienceLoader";
import { ContentLayer } from "@/components/ui/ContentLayer";
import { Hud } from "@/components/ui/Hud";
import { LoadVeil } from "@/components/ui/LoadVeil";
import { PortfolioContent } from "@/components/ui/PortfolioContent";
import { TravelVeil } from "@/components/ui/TravelVeil";
import { Vignette } from "@/components/ui/Vignette";

export default function Home() {
  return (
    <>
      <div className="fixed inset-0">
        <ExperienceLoader />
      </div>
      <Vignette />
      <TravelVeil />
      <LoadVeil />
      <Hud />
      <ContentLayer>
        <PortfolioContent />
      </ContentLayer>
      {/* Without JavaScript the world can't run, so show the HTML portfolio. */}
      <noscript>
        <style>{`#content-layer{position:fixed;inset:0;z-index:20;width:auto;height:auto;margin:0;overflow:auto;clip-path:none;white-space:normal;background:var(--cream)}`}</style>
      </noscript>
    </>
  );
}
