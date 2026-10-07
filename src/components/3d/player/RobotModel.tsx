import { useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { PALETTE, PLAYER, TONES } from "@/config/world";
import { Halo } from "../Effects";
import { glow, matte } from "../materials";
import { runtime } from "@/stores/runtime";

export type RobotMotion = {
  vx: number;
  vz: number;
  speed: number;
  yaw: number;
  // Signed angle still to turn toward the input direction (radians).
  turn: number;
};

// Antenna spring: stiffness, damping and how strongly acceleration tips it.
const SPRING = { stiffness: 110, damping: 8, response: 0.03, limit: 0.7 };
// Body settle spring: a small squash-and-recover when the robot brakes.
const SETTLE = { stiffness: 170, damping: 11 };

const damp = (lambda: number, dt: number) => 1 - Math.exp(-lambda * dt);
const clamp = THREE.MathUtils.clamp;

// Compact explorer robot facing +Z. Readable from above thanks to the coral cap
// and the glowing antenna lantern; the cyan face reads at the camera's pitch.
export function RobotModel({ motion }: { motion: RefObject<RobotMotion> }) {
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const antenna = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const leftFoot = useRef<THREE.Group>(null);
  const rightFoot = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);

  const state = useRef({
    phase: 0,
    walk: 0,
    prevVx: 0,
    prevVz: 0,
    accF: 0,
    accR: 0,
    lean: 0,
    bank: 0,
    settle: 0,
    settleVel: 0,
    look: 0,
    lookTarget: 0,
    nextLook: 3,
    tiltX: 0,
    tiltZ: 0,
    velX: 0,
    velZ: 0,
    nextBlink: 2,
    blinks: 1,
  });

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    if (dt <= 0) return;
    const m = motion.current;
    const s = state.current;
    const t = clock.elapsedTime;
    // Ambient idle motion (breathing, looking around) is stilled for reduced
    // motion; motion that answers the player's input is kept.
    const ambient = runtime.reducedMotion ? 0 : 1;

    // Acceleration in the robot's own frame (forward / right), lightly smoothed.
    const ax = (m.vx - s.prevVx) / dt;
    const az = (m.vz - s.prevVz) / dt;
    s.prevVx = m.vx;
    s.prevVz = m.vz;
    const sin = Math.sin(m.yaw);
    const cos = Math.cos(m.yaw);
    s.accF = THREE.MathUtils.lerp(s.accF, ax * sin + az * cos, damp(20, dt));
    s.accR = THREE.MathUtils.lerp(s.accR, ax * cos - az * sin, damp(20, dt));

    // Gait: walk amount eases in and out; cadence follows ground speed.
    s.walk = THREE.MathUtils.lerp(s.walk, Math.min(m.speed / PLAYER.speed, 1), damp(8, dt));
    const w = s.walk;
    // Cadence follows real ground speed, so the feet never slide.
    s.phase += dt * m.speed * PLAYER.cadence;
    runtime.player.gaitPhase = s.phase;
    const step = Math.sin(s.phase);
    const bounce = Math.abs(Math.cos(s.phase));

    // Lean with pace and into acceleration, back a touch when braking; bank into turns.
    s.lean = THREE.MathUtils.lerp(s.lean, 0.09 * w + clamp(s.accF * 0.012, -0.12, 0.14), damp(9, dt));
    s.bank = THREE.MathUtils.lerp(s.bank, clamp(-m.turn * 0.32 * w, -0.2, 0.2), damp(8, dt));

    // Braking compresses the body; a spring lets it recover with a tiny overshoot.
    const brake = s.accF < 0 ? clamp(-s.accF * 0.0035, 0, 0.07) : 0;
    s.settleVel += ((brake - s.settle) * SETTLE.stiffness - s.settleVel * SETTLE.damping) * dt;
    s.settle += s.settleVel * dt;

    const breath = Math.sin(t * 2.1) * (1 - w) * ambient;
    const squash = 1 - 0.06 * w * (1 - bounce) + 0.012 * breath - s.settle;
    if (body.current) {
      body.current.position.y = 0.08 * w * bounce + 0.02 * breath - s.settle * 0.3;
      body.current.scale.set(1 + (1 - squash) * 0.55, squash, 1 + (1 - squash) * 0.55);
      body.current.rotation.set(s.lean, step * 0.06 * w, s.bank + step * 0.03 * w);
    }

    // Head: leads into turns while walking; idles by glancing around now and then.
    if (t > s.nextLook) {
      s.lookTarget = Math.random() < 0.35 ? 0 : (Math.random() - 0.5) * 0.9;
      s.nextLook = t + 2.5 + Math.random() * 4;
    }
    const lookTarget = w > 0.15 ? clamp(m.turn * 0.6, -0.5, 0.5) : s.lookTarget * ambient;
    s.look = THREE.MathUtils.lerp(s.look, lookTarget, damp(w > 0.15 ? 8 : 3, dt));
    if (head.current) {
      head.current.rotation.set(-s.lean * 0.4, s.look, Math.sin(t * 1.3) * 0.035 * (1 - w) * ambient + step * 0.03 * w);
    }

    for (const [foot, sign] of [[leftFoot, 1], [rightFoot, -1]] as const) {
      if (!foot.current) continue;
      const lift = Math.max(0, Math.sin(s.phase + (sign > 0 ? 0 : Math.PI)));
      foot.current.position.z = 0.17 * w * step * sign;
      foot.current.position.y = lift * 0.1 * w;
      // Toe tips up as the foot swings through.
      foot.current.rotation.x = -lift * 0.35 * w;
    }
    if (leftArm.current) leftArm.current.rotation.set(-0.6 * w * step, 0, 0.06 + 0.05 * w);
    if (rightArm.current) rightArm.current.rotation.set(0.6 * w * step, 0, -0.06 - 0.05 * w);

    // Blink every few seconds; sometimes a quick double blink.
    if (eyes.current) {
      const since = t - s.nextBlink;
      const blinking = since > 0 && (since < 0.11 || (s.blinks === 2 && since > 0.2 && since < 0.31));
      eyes.current.scale.y = blinking ? 0.12 : 1;
      // Eyes glance slightly toward where the head is turning.
      eyes.current.position.x = s.look * 0.05;
      if (since > 0.35) {
        s.nextBlink = t + 2.5 + Math.random() * 3.5;
        s.blinks = Math.random() < 0.25 ? 2 : 1;
      }
    }

    // Antenna: a damped spring driven by acceleration, the gait bounce and the
    // body's bank, so the lantern lags on starts, swings on stops and sways in turns.
    const targetX = clamp(-s.accF * SPRING.response, -SPRING.limit, SPRING.limit) + 0.05 * w * Math.sin(s.phase * 2);
    const targetZ = clamp(s.accR * SPRING.response, -SPRING.limit, SPRING.limit) - s.bank * 0.6;
    s.velX += ((targetX - s.tiltX) * SPRING.stiffness - s.velX * SPRING.damping) * dt;
    s.velZ += ((targetZ - s.tiltZ) * SPRING.stiffness - s.velZ * SPRING.damping) * dt;
    s.tiltX += s.velX * dt;
    s.tiltZ += s.velZ * dt;
    if (antenna.current) antenna.current.rotation.set(s.tiltX, 0, s.tiltZ);
  });

  return (
    <group>
      {/* Boots */}
      {[
        [leftFoot, -0.19],
        [rightFoot, 0.19],
      ].map(([ref, x]) => (
        <group key={x as number} ref={ref as RefObject<THREE.Group>} position-x={x as number}>
          <RoundedBox args={[0.24, 0.16, 0.34]} radius={0.06} smoothness={2} position={[0, 0.08, 0.03]} castShadow material={matte(PALETTE.coral)} />
        </group>
      ))}

      <group ref={body}>
        {/* Torso */}
        <mesh position={[0, 0.55, 0]} scale={[1, 0.92, 0.9]} castShadow material={matte(PALETTE.text)}>
          <sphereGeometry args={[0.42, 10, 8]} />
        </mesh>
        {/* Chest plate with a small lantern-gold light */}
        <RoundedBox args={[0.42, 0.3, 0.12]} radius={0.05} smoothness={2} position={[0, 0.56, 0.34]} material={matte(PALETTE.coral)} />
        <mesh position={[0, 0.58, 0.41]} material={glow(PALETTE.lantern, 1.2)}>
          <circleGeometry args={[0.055, 8]} />
        </mesh>
        {/* Arms */}
        <mesh ref={leftArm} position={[-0.44, 0.58, 0]} castShadow material={matte(PALETTE.coral)}>
          <capsuleGeometry args={[0.08, 0.2, 2, 6]} />
        </mesh>
        <mesh ref={rightArm} position={[0.44, 0.58, 0]} castShadow material={matte(PALETTE.coral)}>
          <capsuleGeometry args={[0.08, 0.2, 2, 6]} />
        </mesh>
        {/* Neck */}
        <mesh position={[0, 0.94, 0]} material={matte(TONES.trunk)}>
          <cylinderGeometry args={[0.1, 0.12, 0.12, 6]} />
        </mesh>

        <group ref={head} position={[0, 1.28, 0]}>
          <RoundedBox args={[0.96, 0.7, 0.78]} radius={0.2} smoothness={3} castShadow material={matte(PALETTE.text)} />
          {/* Coral cap: the shape you recognise from above. */}
          <RoundedBox args={[0.7, 0.1, 0.56]} radius={0.04} smoothness={2} position={[0, 0.36, -0.02]} castShadow material={matte(PALETTE.coral)} />
          {/* Ear bolts */}
          {[-0.5, 0.5].map((x) => (
            <mesh key={x} position={[x, 0, 0]} rotation-z={Math.PI / 2} material={matte(PALETTE.coral)}>
              <cylinderGeometry args={[0.1, 0.1, 0.08, 8]} />
            </mesh>
          ))}
          {/* Face display */}
          <RoundedBox args={[0.74, 0.46, 0.06]} radius={0.05} smoothness={2} position={[0, -0.02, 0.38]} material={matte(TONES.ink)} />
          <group ref={eyes} position={[0, 0.01, 0.42]}>
            {[-0.16, 0.16].map((x) => (
              <mesh key={x} position={[x, 0, 0]} material={glow(PALETTE.cyan, 1.8)}>
                <capsuleGeometry args={[0.05, 0.09, 2, 6]} />
              </mesh>
            ))}
          </group>

          {/* Antenna on a spring pivot at the top of the head */}
          <group ref={antenna} position={[0.16, 0.38, -0.08]}>
            <mesh position={[0, 0.2, 0]} material={matte(TONES.trunk)}>
              <cylinderGeometry args={[0.022, 0.03, 0.4, 5]} />
            </mesh>
            <mesh position={[0, 0.44, 0]} material={glow(PALETTE.lantern, 2)}>
              <icosahedronGeometry args={[0.09, 1]} />
            </mesh>
            <Halo color={PALETTE.lantern} size={0.9} position={[0, 0.44, 0]} opacity={0.55} />
          </group>
        </group>
      </group>
    </group>
  );
}
