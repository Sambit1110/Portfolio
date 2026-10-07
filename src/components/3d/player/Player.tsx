import { useRef, type Ref } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { CoefficientCombineRule } from "@dimforge/rapier3d-compat";
import { CAMERA, PLAYER } from "@/config/world";
import { Controls } from "@/config/controls";
import { isInputLocked, isTouring, useWorldStore } from "@/stores/worldStore";
import { runtime, setPoint } from "@/stores/runtime";
import { RobotModel, type RobotMotion } from "./RobotModel";

type PlayerProps = {
  // Exposes the player's (interpolated) root so camera, light and dust can follow it.
  ref?: Ref<THREE.Group>;
};

// "Up" on screen is away from the camera, flattened onto the ground plane.
const FORWARD = new THREE.Vector3(0, 0, -Math.cos(CAMERA.pitch)).normalize();
const RIGHT = new THREE.Vector3().crossVectors(FORWARD, THREE.Object3D.DEFAULT_UP).normalize();
const SPAWN = { x: PLAYER.spawn[0], y: PLAYER.spawn[1], z: PLAYER.spawn[2] };
const COLLIDER_CENTER = PLAYER.capsuleHalfHeight + PLAYER.capsuleRadius;

const input = new THREE.Vector3();
const worldPosition = new THREE.Vector3();

// Shortest-path exponential damping between two angles.
function dampAngle(from: number, to: number, lambda: number, dt: number) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * (1 - Math.exp(-lambda * dt));
}

export function Player({ ref }: PlayerProps) {
  const body = useRef<RapierRigidBody>(null);
  const root = useRef<THREE.Group>(null);
  const model = useRef<THREE.Group>(null);
  const motion = useRef<RobotMotion>({ vx: 0, vz: 0, speed: 0, yaw: 0, turn: 0 });
  const [, getKeys] = useKeyboardControls<Controls>();

  const setRoot = (group: THREE.Group | null) => {
    root.current = group;
    if (typeof ref === "function") ref(group);
    else if (ref) ref.current = group;
  };

  useFrame((_, delta) => {
    const rb = body.current;
    if (!rb) return;
    // Clamp so a background tab doesn't produce one huge step on return.
    const dt = Math.min(delta, 0.1);

    const { teleport, clearTeleport } = useWorldStore.getState();
    if (teleport) {
      rb.setTranslation({ x: teleport[0], y: SPAWN.y, z: teleport[1] }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      // Cut the camera to the new spot (hidden behind the travel veil).
      runtime.camera.snap = true;
      clearTeleport();
    }

    input.set(0, 0, 0);
    // Keyboard is digital (full speed); the touch joystick is analog.
    let throttle = 1;
    if (!isInputLocked()) {
      const keys = getKeys();
      input
        .addScaledVector(FORWARD, Number(keys.forward) - Number(keys.back))
        .addScaledVector(RIGHT, Number(keys.right) - Number(keys.left));
      const stick = runtime.joystick;
      if (input.lengthSq() === 0 && stick.x * stick.x + stick.y * stick.y > 0) {
        input.addScaledVector(FORWARD, stick.y).addScaledVector(RIGHT, stick.x);
        throttle = Math.min(Math.hypot(stick.x, stick.y), 1);
      }
    }
    // Guided tour: steer toward the driver's waypoint as if the stick were held
    // that way, so walking, turning, gait and collisions behave exactly as usual.
    const autopilot = runtime.autopilot;
    if (autopilot && isTouring()) {
      const at = rb.translation();
      input.set(autopilot.x - at.x, 0, autopilot.z - at.z);
      throttle = autopilot.throttle;
    }
    // Normalise so diagonals aren't faster.
    if (input.lengthSq() > 0) {
      input.normalize().multiplyScalar(PLAYER.speed * throttle);
      runtime.player.hasMoved = true;
      // Moving ends a menu-requested vista.
      const store = useWorldStore.getState();
      if (store.vistaRequested && !isTouring()) store.dismissVista();
    }

    // Ease horizontal velocity toward the target; leave vertical to gravity.
    const current = rb.linvel();
    const blend = 1 - Math.exp(-PLAYER.acceleration * dt);
    const vx = THREE.MathUtils.lerp(current.x, input.x, blend);
    const vz = THREE.MathUtils.lerp(current.z, input.z, blend);
    rb.setLinvel({ x: vx, y: current.y, z: vz }, true);

    const m = motion.current;
    m.vx = vx;
    m.vz = vz;
    m.speed = Math.hypot(vx, vz);
    m.turn = 0;
    if (model.current && input.lengthSq() > 0) {
      const targetYaw = Math.atan2(input.x, input.z);
      const current = model.current.rotation.y;
      // How far the robot still has to turn; drives banking and head lead.
      m.turn = Math.atan2(Math.sin(targetYaw - current), Math.cos(targetYaw - current));
      model.current.rotation.y = dampAngle(current, targetYaw, PLAYER.turnSpeed, dt);
    }
    if (model.current) m.yaw = model.current.rotation.y;

    // Publish the interpolated position (physics has already stepped this frame).
    if (root.current) {
      root.current.updateWorldMatrix(true, false);
      root.current.getWorldPosition(worldPosition);
      setPoint(runtime.player.position, worldPosition.x, worldPosition.y, worldPosition.z);
    }
    setPoint(runtime.player.velocity, vx, 0, vz);

    if (rb.translation().y < PLAYER.killY) {
      rb.setTranslation(SPAWN, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  });

  return (
    <RigidBody
      ref={body}
      position={[...PLAYER.spawn]}
      colliders={false}
      enabledRotations={[false, false, false]}
      canSleep={false}
    >
      <CapsuleCollider
        args={[PLAYER.capsuleHalfHeight, PLAYER.capsuleRadius]}
        position={[0, COLLIDER_CENTER, 0]}
        // Velocity is driven directly, so ground friction would only shave off speed.
        friction={0}
        frictionCombineRule={CoefficientCombineRule.Min}
      />
      <group ref={setRoot}>
        <group ref={model}>
          <RobotModel motion={motion} />
        </group>
      </group>
    </RigidBody>
  );
}
