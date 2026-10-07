import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { TONES } from "@/config/world";
import { runtime } from "@/stores/runtime";
import { matte } from "../materials";

const POOL = 28;
const LIFE = 0.7;
const INTERVAL = 0.085;
const MIN_SPEED = 2;

type Puff = { age: number; x: number; z: number; size: number; drift: number };

const createPool = (): Puff[] => Array.from({ length: POOL }, () => ({ age: LIFE, x: 0, z: 0, size: 0, drift: 0 }));

const matrix = new THREE.Matrix4();
const scale = new THREE.Vector3();
const position = new THREE.Vector3();
const rotation = new THREE.Quaternion();

// Small dust puffs kicked up behind the robot while it walks. A fixed pool in one
// instanced mesh: puffs grow, rise and shrink away.
export function DustTrail() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  // Pool lives in a ref: it is simulation state, mutated every frame.
  const state = useRef({ timer: 0, next: 0, puffs: null as Puff[] | null });
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(0.16, 0), []);

  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(delta, 0.1);
    const { position: p, velocity: v } = runtime.player;
    const speed = Math.hypot(v.x, v.z);

    const s = state.current;
    const puffs = (s.puffs ??= createPool());
    s.timer += dt;
    if (speed > MIN_SPEED && s.timer > INTERVAL) {
      s.timer = 0;
      const puff = puffs[s.next];
      s.next = (s.next + 1) % POOL;
      // Spawn slightly behind the feet, jittered sideways.
      puff.age = 0;
      puff.x = p.x - (v.x / speed) * 0.3 + (Math.random() - 0.5) * 0.4;
      puff.z = p.z - (v.z / speed) * 0.3 + (Math.random() - 0.5) * 0.4;
      puff.size = 0.6 + Math.random() * 0.6;
      puff.drift = Math.random() * Math.PI * 2;
    }

    puffs.forEach((puff, i) => {
      puff.age += dt;
      const life = Math.min(puff.age / LIFE, 1);
      const size = life >= 1 ? 0 : Math.sin(Math.PI * Math.sqrt(life)) * puff.size;
      position.set(puff.x, 0.08 + life * 0.35, puff.z);
      rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, puff.drift + life);
      matrix.compose(position, rotation, scale.setScalar(size));
      m.setMatrixAt(i, matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, matte(TONES.dust), POOL]}
      // Puffs move every frame, so skip culling rather than recompute bounds.
      frustumCulled={false}
    />
  );
}
