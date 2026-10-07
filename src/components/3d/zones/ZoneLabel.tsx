import { ZONE_BY_ID, type ZoneId } from "@/content/zones";
import { GroundText } from "../GroundText";

// Zone name painted on the ground just outside its ring, with the landmark below.
export function ZoneLabel({ id, offset = [0, 0] }: { id: ZoneId; offset?: [number, number] }) {
  const zone = ZONE_BY_ID[id];
  const x = zone.position[0] + offset[0];
  const z = zone.position[1] + zone.radius + 1.3 + offset[1];
  return (
    <group>
      <GroundText position={[x, z]} size={1.05}>
        {zone.title.toUpperCase()}
      </GroundText>
      <GroundText position={[x, z + 0.95]} size={0.42} bold={false} opacity={0.85}>
        {zone.landmark}
      </GroundText>
    </group>
  );
}
