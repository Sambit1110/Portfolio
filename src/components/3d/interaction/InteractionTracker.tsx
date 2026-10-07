import { useFrame } from "@react-three/fiber";
import { INTERACTABLES, type Interactable } from "@/lib/interactables";
import { useWorldStore } from "@/stores/worldStore";
import { runtime } from "@/stores/runtime";

// Finds what the player can interact with and publishes it to the store. A
// specific target (a pedestal, crystal, milestone…) beats the zone ring it
// sits in; among equals the nearest wins. The store only updates on change.
export function InteractionTracker() {
  useFrame(() => {
    const { x, z } = runtime.player.position;
    let best: Interactable | null = null;
    let bestScore = Infinity;
    for (const target of INTERACTABLES) {
      const d = Math.hypot(x - target.position[0], z - target.position[1]);
      if (d >= target.radius) continue;
      const score = d + (target.kind === "zone" ? 1000 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = target;
      }
    }
    useWorldStore.getState().setNearby(best ? { kind: best.kind, id: best.id } : null);
  });
  return null;
}
