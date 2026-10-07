"use client";

import { useInteractionKeys } from "@/hooks/useInteractionKeys";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { CAMERA } from "@/config/world";
import { useDeviceStore } from "@/stores/deviceStore";
import { useWorldStore } from "@/stores/worldStore";
import { InteractionPrompt } from "./InteractionPrompt";
import { Menu } from "./Menu";
import { SoundToggle } from "./SoundToggle";
import { VisitedZones } from "./VisitedZones";
import { ContentPanel } from "./panels/ContentPanel";
import { InteractButton } from "./touch/InteractButton";
import { Joystick } from "./touch/Joystick";

// The HUD fades in as the arrival vista begins its glide down to the robot.
const HUD_DELAY_MS = CAMERA.vista.introHold * 1000;

// Shown while the menu's "View world" vista is up. Bottom-left, so it never
// covers a landmark (the lighthouse sits at the bottom centre of the vista).
// On touch it is a button, since there is no Escape key.
function ViewWorldHint({ touch }: { touch: boolean }) {
  const shown = useWorldStore((s) => s.vistaRequested);
  const dismiss = useWorldStore((s) => s.dismissVista);
  const className = `rounded-full bg-ink/70 px-4 py-2 text-sm text-cream backdrop-blur-sm transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
    shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
  }`;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute"
      style={{ left: "max(1.5rem, env(safe-area-inset-left))", bottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      {touch ? (
        <button type="button" onClick={dismiss} tabIndex={shown ? 0 : -1} className={`pointer-events-auto min-h-11 touch-manipulation ${className}`}>
          {shown ? "Return to the world" : ""}
        </button>
      ) : (
        <p className={className}>{shown ? "Move or press Esc to return" : ""}</p>
      )}
    </div>
  );
}

// The only screen-space UI over the world. Everything else lives in the scene.
export function Hud() {
  useInteractionKeys();
  useDeviceDetection();
  useKeyboardInset();
  const hidden = useWorldStore((s) => s.pageView || !s.worldAvailable);
  const ready = useWorldStore((s) => s.worldReady);
  const busy = useWorldStore((s) => s.active !== null || s.menuOpen);
  const setPageView = useWorldStore((s) => s.setPageView);
  const touch = useDeviceStore((s) => s.touch);

  if (hidden) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 font-display">
      {/* First tab stop: keyboard and screen-reader users can skip the 3D world.
          Outside the fade so it is usable from the very first moment. */}
      <button
        type="button"
        onClick={() => setPageView(true)}
        className="pointer-events-auto absolute top-4 left-1/2 z-10 -translate-x-1/2 -translate-y-20 rounded-full bg-ink px-4 py-2 text-sm text-cream focus:translate-y-0 focus-visible:outline-2 focus-visible:outline-cyan"
      >
        Skip to the portfolio as a page
      </button>

      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-out ${ready ? "opacity-100" : "opacity-0"}`}
        style={{ transitionDelay: ready ? `${HUD_DELAY_MS}ms` : "0ms" }}
      >
        {/* Touch: the movement pad sits underneath every other control. */}
        {touch && <Joystick enabled={!busy} />}
        <div
          className="pointer-events-auto absolute"
          style={{ top: "max(1rem, env(safe-area-inset-top))", left: "max(1rem, env(safe-area-inset-left))" }}
        >
          <Menu />
        </div>
        <div
          className="pointer-events-auto absolute flex items-center gap-2"
          style={{ top: "max(1rem, env(safe-area-inset-top))", right: "max(1rem, env(safe-area-inset-right))" }}
        >
          <SoundToggle />
          <VisitedZones />
        </div>
        {touch ? <InteractButton /> : <InteractionPrompt />}
        <ViewWorldHint touch={touch} />
      </div>
      <div className="pointer-events-auto">
        <ContentPanel />
      </div>
    </div>
  );
}
