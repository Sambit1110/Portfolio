import { PROFILE } from "@/content/profile";
import { PLAZA_RADIUS } from "@/lib/paths";
import { GroundArrow, GroundText, Keycap } from "../GroundText";
import { Lantern } from "../props/Lantern";
import { AICore } from "./AICore";

const LANTERN_RADIUS = PLAZA_RADIUS + 0.9;
// Exits (east, south, west, north); a lantern stands either side of each.
const EXIT_ANGLES = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
export const LANTERNS = EXIT_ANGLES.flatMap((a) =>
  [-0.3, 0.3].map((o) => [Math.cos(a + o) * LANTERN_RADIUS, Math.sin(a + o) * LANTERN_RADIUS] as [number, number]),
);

// Central spawn plaza: the AI Core, the name, the controls hint and route signs.
export function Plaza() {
  return (
    <group>
      <AICore />

      <GroundText position={[0, 1.2]} size={1.25} letterSpacing={0.06}>
        {PROFILE.name.toUpperCase()}
      </GroundText>
      <GroundText position={[0, 2.3]} size={0.42} bold={false} opacity={0.9}>
        {PROFILE.role}
      </GroundText>

      {/* Controls, drawn into the world rather than shown as UI. */}
      <Keycap label="W" position={[-4.6, 5.3]} />
      <Keycap label="A" position={[-5.6, 6.3]} />
      <Keycap label="S" position={[-4.6, 6.3]} />
      <Keycap label="D" position={[-3.6, 6.3]} />
      <GroundText position={[-4.6, 7.3]} size={0.32} bold={false}>
        MOVE · OR ARROW KEYS
      </GroundText>
      <Keycap label="E" position={[4.6, 5.8]} />
      <GroundText position={[4.6, 6.8]} size={0.32} bold={false}>
        INTERACT
      </GroundText>

      {/* Route signs just beyond each plaza exit. */}
      <GroundText position={[0.5, -10.4]} size={0.6}>
        PROJECTS
      </GroundText>
      <GroundArrow position={[0.5, -11.8]} angle={Math.PI / 2} />
      <GroundText position={[-10.8, -0.75]} size={0.6}>
        SKILLS
      </GroundText>
      <GroundArrow position={[-13.6, -0.95]} angle={Math.PI} />
      <GroundText position={[11.2, 0.65]} size={0.6}>
        EXPERIENCE
      </GroundText>
      <GroundArrow position={[14.4, 0.95]} angle={0} />
      <GroundText position={[-0.5, 10.4]} size={0.6}>
        ABOUT · CONTACT
      </GroundText>
      <GroundArrow position={[-0.5, 11.8]} angle={-Math.PI / 2} />

      {LANTERNS.map((p, i) => (
        <Lantern key={i} position={p} />
      ))}
    </group>
  );
}
