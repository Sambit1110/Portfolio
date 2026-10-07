import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { TONES } from "@/config/world";
import { singleton } from "../materials";

const PUFFS = 12;
const CYCLE = 9;
const RISE = 11;
// Drift per full rise: a light breeze carrying the smoke east. The column's top
// just peeks into the bottom of the play view from the plaza; it stays thin so
// it never covers the scene (it rises toward the camera, so size grows fast).
const DRIFT = { x: 2.2, z: -0.8 };

const geometry = singleton(() => new THREE.IcosahedronGeometry(0.5, 0));
const material = singleton(
  () =>
    new THREE.MeshStandardMaterial({
      color: TONES.smoke,
      flatShading: true,
      roughness: 1,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    }),
);

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const rotation = new THREE.Quaternion();
const scale = new THREE.Vector3();
const euler = new THREE.Euler();

const smoothstep = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// A slow column of low-poly smoke puffs: a campsite you can spot from afar.
export function Smoke({ position: origin }: { position: [number, number] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < PUFFS; i++) {
      const c = (t / CYCLE + i / PUFFS) % 1;
      const drift = c * c;
      position.set(
        origin[0] + drift * DRIFT.x + Math.sin(t * 0.6 + i) * 0.25,
        0.9 + c * RISE,
        origin[1] + drift * DRIFT.z,
      );
      // Grow as they rise, then thin away near the top.
      const size = (0.4 + c * 1.1) * (1 - smoothstep(0.7, 1, c)) * smoothstep(0, 0.06, c);
      rotation.setFromEuler(euler.set(i, t * 0.2 + i, 0));
      m.setMatrixAt(i, matrix.compose(position, rotation, scale.setScalar(size)));
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry(), material(), PUFFS]} frustumCulled={false} />;
}
