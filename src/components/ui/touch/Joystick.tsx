"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { runtime } from "@/stores/runtime";
import { useWorldStore } from "@/stores/worldStore";

// Knob travel in CSS pixels, and the share of it that counts as "no input".
const MAX_RADIUS = 46;
const DEAD_ZONE = 0.18;

const release = () => {
  runtime.joystick.x = 0;
  runtime.joystick.y = 0;
};

// Floating analog stick for touch devices. Touching anywhere in the lower-left
// zone places the stick under the thumb; dragging steers; lifting recentres.
// The knob moves by direct style updates, not React renders, so it costs
// nothing per frame.
export function Joystick({ enabled }: { enabled: boolean }) {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });

  const place = (dx: number, dy: number, active: boolean) => {
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
    base.current?.toggleAttribute("data-active", active);
  };

  const end = (event?: PointerEvent<HTMLDivElement>) => {
    if (event && event.pointerId !== pointer.current) return;
    pointer.current = null;
    release();
    place(0, 0, false);
    if (base.current) base.current.style.transform = "";
  };

  // Disabled (a panel or the menu opened): let go immediately.
  useEffect(() => {
    if (!enabled) {
      pointer.current = null;
      release();
      place(0, 0, false);
      if (base.current) base.current.style.transform = "";
    }
  }, [enabled]);
  useEffect(() => release, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled || pointer.current !== null) return;
    // Touching the stick takes back control from the guided tour at once.
    const store = useWorldStore.getState();
    if (store.guidedTour?.phase === "touring") store.endTour(false);
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = event.pointerId;
    origin.current = { x: event.clientX, y: event.clientY };
    // Float the stick to where the thumb landed.
    const rect = base.current?.getBoundingClientRect();
    if (base.current && rect) {
      base.current.style.transform = `translate(${event.clientX - (rect.left + rect.width / 2)}px, ${event.clientY - (rect.top + rect.height / 2)}px)`;
    }
    place(0, 0, true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== pointer.current) return;
    const dx = event.clientX - origin.current.x;
    const dy = event.clientY - origin.current.y;
    const distance = Math.hypot(dx, dy);
    const clamped = Math.min(distance, MAX_RADIUS);
    const ux = distance > 0 ? dx / distance : 0;
    const uy = distance > 0 ? dy / distance : 0;
    place(ux * clamped, uy * clamped, true);
    // Analog magnitude with a dead zone, rescaled so it still reaches 1.
    const magnitude = Math.max(0, (clamped / MAX_RADIUS - DEAD_ZONE) / (1 - DEAD_ZONE));
    runtime.joystick.x = ux * magnitude;
    runtime.joystick.y = -uy * magnitude;
  };

  return (
    <div
      role="application"
      aria-label="Movement pad. Touch and drag to move the explorer."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onContextMenu={(event) => event.preventDefault()}
      className={`no-callout pointer-events-auto absolute bottom-0 left-0 h-[42%] w-1/2 touch-none select-none ${enabled ? "" : "pointer-events-none opacity-0"}`}
    >
      <div
        ref={base}
        className="group absolute grid size-26 place-items-center rounded-full border border-cream/35 bg-ink/15 backdrop-blur-[2px] transition-opacity duration-300 data-[active]:opacity-100 opacity-45"
        style={{ left: "max(1.25rem, env(safe-area-inset-left))", bottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div
          ref={knob}
          className="size-11 rounded-full bg-cream/85 shadow-[0_4px_14px_rgba(47,38,56,0.3)] transition-shadow group-data-[active]:shadow-[0_0_0_2px_rgba(93,224,230,0.7),0_4px_14px_rgba(47,38,56,0.3)]"
        />
      </div>
    </div>
  );
}
