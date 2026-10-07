"use client";

import { useEffect } from "react";
import { KEYBOARD_MAP } from "@/config/controls";
import { useWorldStore } from "@/stores/worldStore";

// Every movement key (WASD and arrows), by physical key code.
const MOVEMENT_KEYS = new Set(KEYBOARD_MAP.flatMap((entry) => entry.keys));

// Keys that must not trigger world actions while a control has focus.
function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && target.closest("button, a, input, textarea, select, [contenteditable]") !== null;
}

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

      const interact = event.key === "e" || event.key === "E" || event.key === "Enter";
      if (!interact || event.repeat || isTypingTarget(event.target)) return;
      if (touring || store.active || store.menuOpen || store.pageView || !store.nearby) return;
      event.preventDefault();
      store.open(store.nearby);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
