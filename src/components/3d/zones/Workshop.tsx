import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import { PALETTE, TONES } from "@/config/world";
import { PEDESTALS, type Pedestal } from "@/lib/placements";
import { runtime } from "@/stores/runtime";
import { Halo } from "../Effects";
import { FONT_BOLD } from "../GroundText";
import { createGlow, glow, matte, singleton } from "../materials";
import { Crate } from "../props/Crate";
import { TargetLabel } from "../interaction/TargetLabel";
import { useTargetGlow } from "../interaction/useTargetGlow";
import { ZoneLabel } from "./ZoneLabel";

export const SHED: [number, number] = [0, -28.5];
const SHED_SIZE = { w: 5, h: 2.6, d: 4 };
const MAST_HEIGHT = 9;
const SCREEN = { w: 1.2, h: 0.8, y: 2.2 };

const signMat = singleton(() => createGlow(PALETTE.cyan, 0.8));

// Gable roof: a triangle extruded front-to-back, so the gable faces the camera.
function createRoofGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-SHED_SIZE.w / 2 - 0.45, 0);
  s.lineTo(SHED_SIZE.w / 2 + 0.45, 0);
  s.lineTo(0, 1.9);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: SHED_SIZE.d + 0.7, bevelEnabled: false });
  g.translate(0, 0, -(SHED_SIZE.d + 0.7) / 2);
  return g;
}

// Thin rectangular outline around a holo screen, as one flat mesh.
const screenFrame = singleton(() => {
  const { w, h } = SCREEN;
  const t = 0.05;
  const outer = new THREE.Shape();
  outer.moveTo(-w / 2 - t, -h / 2 - t);
  outer.lineTo(w / 2 + t, -h / 2 - t);
  outer.lineTo(w / 2 + t, h / 2 + t);
  outer.lineTo(-w / 2 - t, h / 2 + t);
  outer.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-w / 2, -h / 2);
  hole.lineTo(-w / 2, h / 2);
  hole.lineTo(w / 2, h / 2);
  hole.lineTo(w / 2, -h / 2);
  hole.closePath();
  outer.holes.push(hole);
  return new THREE.ShapeGeometry(outer);
});

// One project slot: pedestal, holo screen with its number, cyan rim that wakes
// as the player approaches, and the project's name floating above.
function ProjectPedestal({ pedestal }: { pedestal: Pedestal }) {
  const { project, index, position } = pedestal;
  const glowLevel = useTargetGlow({ kind: "project", id: project.id });
  const screen = useRef<THREE.Group>(null);
  const screenMat = useRef<THREE.MeshBasicMaterial>(null);
  const frameMat = useRef<THREE.MeshStandardMaterial>(null);
  const rimMat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const g = glowLevel.current;
    const zone = runtime.zoneGlow.projects;
    if (screen.current) screen.current.position.y = SCREEN.y + Math.sin(clock.elapsedTime * 1.5 + index * 1.3) * 0.08;
    if (screenMat.current) screenMat.current.opacity = 0.12 + zone * 0.08 + g * 0.3;
    if (frameMat.current) frameMat.current.emissiveIntensity = 0.4 + zone * 0.4 + g * 1.6;
    if (rimMat.current) rimMat.current.emissiveIntensity = 0.2 + g * 2;
  });

  return (
    <group position={[position[0], 0, position[1]]}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow material={matte(PALETTE.text)}>
        <cylinderGeometry args={[0.45, 0.6, 1, 8]} />
      </mesh>
      <mesh position={[0, 1.04, 0]} material={matte(PALETTE.rock)}>
        <cylinderGeometry args={[0.5, 0.5, 0.08, 8]} />
      </mesh>
      <mesh position={[0, 1.09, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.47, 0.03, 4, 24]} />
        <meshStandardMaterial ref={rimMat} color={PALETTE.cyan} emissive={PALETTE.cyan} emissiveIntensity={0.2} />
      </mesh>
      {/* Experimental work carries an amber tag (amber = unfinished, never interactive). */}
      {project.status === "experimental" && (
        <mesh position={[0, 0.72, 0.53]} rotation-x={-0.25} material={glow(PALETTE.amber, 0.9)}>
          <boxGeometry args={[0.34, 0.12, 0.03]} />
        </mesh>
      )}

      <group ref={screen} position={[0, SCREEN.y, 0]} rotation-x={-0.35}>
        <mesh>
          <planeGeometry args={[SCREEN.w, SCREEN.h]} />
          <meshBasicMaterial ref={screenMat} color={PALETTE.cyan} transparent opacity={0.12} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh geometry={screenFrame()}>
          <meshStandardMaterial ref={frameMat} color={PALETTE.cyan} emissive={PALETTE.cyan} emissiveIntensity={0.4} />
        </mesh>
        <Text font={FONT_BOLD} fontSize={0.36} position={[0, 0, 0.01]} color={PALETTE.text} anchorX="center" anchorY="middle" letterSpacing={0.08}>
          {String(index + 1).padStart(2, "0")}
        </Text>
      </group>

      <TargetLabel text={project.shortName} position={[0, 3.05, 0]} glow={glowLevel} />
    </group>
  );
}

export function Workshop() {
  const roof = useMemo(() => createRoofGeometry(), []);
  const beacon = useRef<THREE.Group>(null);
  const dish = useRef<THREE.Group>(null);
  // Position in the beacon's blip cycle (0..1), accumulated so the cycle can
  // quicken without skipping.
  const cycle = useRef(0);

  useFrame(({ clock }, delta) => {
    const g = runtime.zoneGlow.projects;
    const t = clock.elapsedTime;
    signMat().emissiveIntensity = 0.5 + g * 1.5;
    const still = runtime.reducedMotion;
    // The beacon "blips" like a radio signal, a double pulse each period,
    // quickening as the player approaches the workshop.
    const period = 2.6 - g * 1.1;
    cycle.current = (cycle.current + delta / period) % 1;
    const p = cycle.current;
    const blip = Math.exp(-(((p - 0.05) * 30) ** 2)) + 0.6 * Math.exp(-(((p - 0.17) * 30) ** 2));
    if (beacon.current) beacon.current.scale.setScalar(0.85 + (still ? 0.15 : blip * 0.45));
    // The research dish slowly scans the sky.
    if (dish.current && !still) dish.current.rotation.y = Math.sin(t * 0.22) * 0.8;
  });

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[SHED_SIZE.w / 2, SHED_SIZE.h / 2, SHED_SIZE.d / 2]} position={[SHED[0], SHED_SIZE.h / 2, SHED[1]]} />
        <CylinderCollider args={[MAST_HEIGHT / 2, 0.35]} position={[4, MAST_HEIGHT / 2, -29.6]} />
        <CuboidCollider args={[1.1, 0.5, 0.45]} position={[-4, 0.5, -25.6]} />
        {PEDESTALS.map(({ project, position: [x, z] }) => (
          <CylinderCollider key={project.id} args={[0.5, 0.6]} position={[x, 0.5, z]} />
        ))}
      </RigidBody>

      {/* Shed */}
      <group position={[SHED[0], 0, SHED[1]]}>
        <mesh position={[0, SHED_SIZE.h / 2, 0]} castShadow receiveShadow material={matte(TONES.wood)}>
          <boxGeometry args={[SHED_SIZE.w, SHED_SIZE.h, SHED_SIZE.d]} />
        </mesh>
        <mesh geometry={roof} position={[0, SHED_SIZE.h, 0]} castShadow material={matte(PALETTE.coral)} />
        <mesh position={[0, 0.95, SHED_SIZE.d / 2 + 0.01]} material={matte(TONES.ink)}>
          <planeGeometry args={[1.1, 1.9]} />
        </mesh>
        {[-1.6, 1.6].map((x) => (
          <mesh key={x} position={[x, 1.45, SHED_SIZE.d / 2 + 0.01]} material={glow(PALETTE.lantern, 1)}>
            <planeGeometry args={[0.8, 0.65]} />
          </mesh>
        ))}
        {/* Cyan sign over the door: this building is interactive. */}
        <mesh position={[0, 2.2, SHED_SIZE.d / 2 + 0.03]} material={signMat()}>
          <boxGeometry args={[1.5, 0.32, 0.04]} />
        </mesh>
      </group>

      {/* Research mast: the workshop's silhouette from afar, topped by a cyan beacon. */}
      <group position={[4, 0, -29.6]}>
        <mesh position={[0, MAST_HEIGHT / 2, 0]} castShadow material={matte(TONES.trunk)}>
          <cylinderGeometry args={[0.08, 0.2, MAST_HEIGHT, 6]} />
        </mesh>
        {[3, 5.4].map((y) => (
          <mesh key={y} position={[0, y, 0]} castShadow material={matte(TONES.trunk)}>
            <boxGeometry args={[1.1, 0.07, 0.07]} />
          </mesh>
        ))}
        <group ref={dish} position={[0, 6.4, 0]}>
          <mesh position={[0, 0, 0.3]} rotation-x={-0.9} castShadow material={matte(PALETTE.text)}>
            <sphereGeometry args={[1.05, 10, 5, 0, Math.PI * 2, 0, Math.PI / 3]} />
          </mesh>
        </group>
        <group ref={beacon} position={[0, MAST_HEIGHT + 0.2, 0]}>
          <mesh material={glow(PALETTE.cyan, 2.2)}>
            <icosahedronGeometry args={[0.22, 0]} />
          </mesh>
          <Halo color={PALETTE.cyan} size={3.2} opacity={0.5} additive={false} />
        </group>
      </group>

      {/* Workbench */}
      <group position={[-4, 0, -25.6]}>
        <mesh position={[0, 0.8, 0]} castShadow receiveShadow material={matte(TONES.woodDark)}>
          <boxGeometry args={[2.2, 0.12, 0.9]} />
        </mesh>
        {[-0.95, 0.95].map((x) => (
          <mesh key={x} position={[x, 0.4, 0]} castShadow material={matte(TONES.woodDark)}>
            <boxGeometry args={[0.12, 0.8, 0.8]} />
          </mesh>
        ))}
        <mesh position={[-0.5, 1.0, 0]} castShadow material={matte(PALETTE.amber)}>
          <boxGeometry args={[0.5, 0.28, 0.4]} />
        </mesh>
        <mesh position={[0.45, 0.98, 0.1]} castShadow material={matte(PALETTE.rock)}>
          <cylinderGeometry args={[0.16, 0.16, 0.25, 8]} />
        </mesh>
      </group>

      {/* One pedestal per project in content/projects.ts. */}
      {PEDESTALS.map((pedestal) => (
        <ProjectPedestal key={pedestal.project.id} pedestal={pedestal} />
      ))}

      <Crate position={[7, -26.6]} />
      <Crate position={[7.9, -27.3]} />
      <Crate position={[7.2, -28.1]} />

      <ZoneLabel id="projects" offset={[0, -0.4]} />
    </group>
  );
}
