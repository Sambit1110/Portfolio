"use client";

import { useEffect } from "react";
import { useWorldStore } from "@/stores/worldStore";

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

      if (event.key === "Escape") {
        if (store.active) store.close();
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
      if (store.active || store.menuOpen || store.pageView || !store.nearby) return;
      event.preventDefault();
      store.open(store.nearby);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
