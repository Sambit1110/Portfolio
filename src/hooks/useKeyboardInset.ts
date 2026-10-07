"use client";

import { useEffect } from "react";

// Tracks the on-screen keyboard for bottom sheets:
// - --keyboard-inset: how much of the layout viewport the keyboard covers. iOS
//   overlays the keyboard (the visual viewport reveals it); Android resizes the
//   page instead (interactive-widget=resizes-content), leaving this at 0.
// - .is-typing on <html>: a text field inside a panel has focus AND a keyboard
//   is actually up, so the panel can make room. Focus alone isn't enough: iOS
//   doesn't show the keyboard for programmatic focus.
export function useKeyboardInset() {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const coarse = window.matchMedia("(pointer: coarse)");
    // Tallest height seen for the current orientation: the "no keyboard" size.
    let fullHeight = window.innerHeight;

    const update = () => {
      fullHeight = Math.max(fullHeight, window.innerHeight);
      const covered = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
      // Ignore small differences (browser chrome showing and hiding).
      const inset = covered > 80 ? Math.round(covered) : 0;
      root.style.setProperty("--keyboard-inset", `${inset}px`);

      const keyboardUp = inset > 0 || window.innerHeight < fullHeight * 0.78;
      const el = document.activeElement;
      const inPanelField = el instanceof HTMLElement && el.matches("textarea, input") && el.closest(".content-panel") !== null;
      root.classList.toggle("is-typing", coarse.matches && keyboardUp && inPanelField);
    };
    const onRotate = () => {
      fullHeight = 0;
      // Let the new size settle before measuring.
      setTimeout(update, 300);
    };
    // On focusout the next element isn't focused yet; check a tick later.
    const onFocusOut = () => setTimeout(update, 0);

    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", onRotate);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", onRotate);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", onFocusOut);
      root.style.removeProperty("--keyboard-inset");
      root.classList.remove("is-typing");
    };
  }, []);
}
