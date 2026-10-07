"use client";

import { useEffect } from "react";
import { KEYBOARD_MAP } from "@/config/controls";
import { interactionBlocked, useWorldStore } from "@/stores/worldStore";

// Every movement key (WASD and arrows), by physical key code.
const MOVEMENT_KEYS = new Set(KEYBOARD_MAP.flatMap((entry) => entry.keys));

// Fields that take typed text: there E is a letter and Enter submits.
const TEXT_ENTRY = "input, textarea, select, [contenteditable]";
// Controls Enter activates by itself (a focused button or link), plus text fields.
const ENTER_TARGETS = `button, a, ${TEXT_ENTRY}`;

const within = (target: EventTarget | null, selector: string) => target instanceof HTMLElement && target.closest(selector) !== null;

// E / Enter opens whatever the player stands at; Escape closes whatever is open,
// innermost first.
export function useInteractionKeys() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const store = useWorldStore.getState();
      const touring = store.guidedTour?.phase === "touring";

      // A movement key takes back control from the tour at once; the same key
      // press then moves the robot as usual.
      if (touring && MOVEMENT_KEYS.has(event.code)) {
        store.endTour(false);
        return;
      }

      if (event.key === "Escape") {
        if (touring) store.endTour(false);
        else if (store.active) store.close();
        else if (store.vistaRequested) store.dismissVista();
        else if (store.menuOpen) {
          // Focus inside the menu would otherwise drop to the page as it hides.
          const inMenu = document.getElementById("world-menu")?.contains(document.activeElement);
          store.setMenuOpen(false);
          if (inMenu) document.querySelector<HTMLElement>('[aria-controls="world-menu"]')?.focus();
        }
        else if (store.pageView && store.worldAvailable) store.setPageView(false);
        else return;
        event.preventDefault();
        return;
      }

      const enter = event.key === "Enter";
      if (!(enter || event.key === "e" || event.key === "E") || event.repeat) return;
      // A focused button keeps Enter for itself, but not E: E only stops
      // short of fields where it would type. (A clicked HUD button, such as
      // Sound or Menu, keeps focus while the visitor walks on.)
      if (within(event.target, enter ? ENTER_TARGETS : TEXT_ENTRY)) return;
      if (interactionBlocked(store) || !store.nearby) return;
      event.preventDefault();
      store.open(store.nearby);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
