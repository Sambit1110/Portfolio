import { ZONES } from "@/content/zones";
import { useMemo } from "react";
import { QUALITY_SETTINGS } from "@/config/quality";
import { WORLD } from "@/config/world";
import { useDeviceStore } from "@/stores/deviceStore";
import { LAYOUT } from "@/lib/layout";
import { Bushes } from "./Bushes";
import { GroundDetails } from "./GroundDetails";
import { Monoliths } from "./Monoliths";
import { Rocks } from "./Rocks";
import { Trees } from "./Trees";
import { Water } from "./Water";
import { GlowMushrooms } from "./interaction/GlowMushrooms";
import { InteractionMarker } from "./interaction/InteractionMarker";
import { Camp } from "./zones/Camp";
import { CrystalGarden } from "./zones/CrystalGarden";
import { Lighthouse } from "./zones/Lighthouse";
import { MilestonePath } from "./zones/MilestonePath";
import { Plaza } from "./zones/Plaza";
import { Workshop } from "./zones/Workshop";

// Border forest chunked along its band (north, east, west strips, ~24 units per
// segment). Each chunk's bounds hug the band, so none overlaps the playfield and
// off-screen chunks are culled; grid-aligned chunks would straddle the wall.
const BORDER_CHUNKS = (() => {
  const chunks = new Map<string, typeof LAYOUT.borderTrees>();
  for (const tree of LAYOUT.borderTrees) {
    const [x, , z] = tree.position;
    const side = Math.abs(x) > WORLD.boundary ? (x < 0 ? "west" : "east") : "north";
    const along = side === "north" ? x : z;
    const key = `${side}:${Math.floor(along / 24)}`;
    const list = chunks.get(key);
    if (list) list.push(tree);
    else chunks.set(key, [tree]);
  }
  return [...chunks.values()];
})();

// How far a border tree stands beyond the playable wall.
const depthBeyondWall = ([x, , z]: [number, number, number]) =>
  Math.max(Math.abs(x) - WORLD.boundary, -z - WORLD.boundary);

// Everything in the world apart from the ground and the player.
export function Environment() {
  const borderDepth = QUALITY_SETTINGS[useDeviceStore((s) => s.quality)].borderDepth;
  // Low quality keeps only the forest band the camera can actually reach.
  const borderChunks = useMemo(
    () =>
      Number.isFinite(borderDepth)
        ? BORDER_CHUNKS.map((trees) => trees.filter((t) => depthBeyondWall(t.position) <= borderDepth)).filter((c) => c.length > 0)
        : BORDER_CHUNKS,
    [borderDepth],
  );
  return (
    <group>
      {/* Reachable scenery: solid. */}
      <Trees trees={LAYOUT.trees} colliders />
      <Bushes bushes={LAYOUT.bushes} colliders />
      <Rocks rocks={LAYOUT.rocks} colliders />
      <Monoliths stones={LAYOUT.monoliths} />

      {/* Beyond the walls: visual only. */}
      {borderChunks.map((trees, i) => (
        <Trees key={i} trees={trees} />
      ))}
      <Water />

      <GroundDetails />

      {/* Landmarks */}
      <Plaza />
      <Workshop />
      <CrystalGarden />
      <MilestonePath />
      <Camp />
      <Lighthouse />

      {/* Interaction language: cyan rings and mushrooms around every zone. */}
      {ZONES.map((zone) => (
        <InteractionMarker key={zone.id} zone={zone} />
      ))}
      <GlowMushrooms />
    </group>
  );
}
