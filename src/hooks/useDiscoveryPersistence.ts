"use client";

import { useEffect } from "react";
import { ZONE_BY_ID, type ZoneId } from "@/content/zones";
import { useWorldStore } from "@/stores/worldStore";

const STORAGE_KEY = "sambit-portfolio:discovered:v1";

// Remembers which zones the visitor has opened, so returning to the world keeps
// its progress. Read after mount (the server renders no progress, so hydration
// matches), and every storage call is fail-safe: private modes just forget.
export function useDiscoveryPersistence() {
  useEffect(() => {
    const store = useWorldStore.getState();
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (Array.isArray(saved)) {
        // Only ids that still exist in content/zones.ts.
        store.restoreVisited(saved.filter((id): id is ZoneId => typeof id === "string" && id in ZONE_BY_ID));
      }
    } catch {
      // Unreadable or blocked storage: start fresh.
    }
    return useWorldStore.subscribe((state, previous) => {
      if (state.visited === previous.visited) return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.visited));
      } catch {
        // Storage full or blocked: progress just won't persist.
      }
    });
  }, []);
}
