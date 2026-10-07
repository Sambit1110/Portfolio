import { useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { CAMERA, PLAYER } from "@/config/world";
import { INTERACTABLE_BY_KEY, targetKey } from "@/lib/interactables";
import { TOUR_STOPS } from "@/lib/tour";
import { useWorldStore } from "@/stores/worldStore";
import { runtime, setPoint } from "@/stores/runtime";

type FollowCameraProps = {
  target: RefObject<THREE.Object3D | null>;
};

// Unit vector from the focus point to the camera: due south, pitched down.
const OFFSET_DIR = new THREE.Vector3(0, Math.sin(CAMERA.pitch), Math.cos(CAMERA.pitch));
// Aim a little above the feet so the robot sits at screen centre.
const LOOK_HEIGHT = 0.8;
// While a panel is open, the focus drifts this far toward its target...
const ZONE_PULL = 0.35;
// ...and slides right on wide screens so the landmark sits clear of the panel,
// or south on phones so it sits above the bottom sheet.
const PANEL_SHIFT = 3.2;
const SHEET_SHIFT = 4;
// Guided tour: while the robot pauses at a stop, the view leans gently toward
// the landmark (less than for a panel, and with no room to make for one).
const TOUR_PULL = 0.3;
const TOUR_ZOOM = 0.9;
// Fog distances at play distance; scaled with the camera so the vista stays clear.
const FOG = { near: 50, far: 105 };

const VISTA = CAMERA.vista;
const VISTA_FOCUS = new THREE.Vector3(VISTA.focus[0], 0, VISTA.focus[1]);

const goal = new THREE.Vector3();
const desiredAhead = new THREE.Vector3();
const zoneCentre = new THREE.Vector3();
const blended = new THREE.Vector3();

const damp = (lambda: number, dt: number) => 1 - Math.exp(-lambda * dt);
const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

// Panel focus transition: eased in when a panel opens, out when it closes.
const PANEL_IN = 0.9;
const PANEL_OUT = 0.8;

const change = new THREE.Vector3();
const temp = new THREE.Vector3();

// Critically damped spring toward `target` (the SmoothDamp formulation): eases
// in and out of motion instead of the abrupt start of an exponential lerp.
function smoothDamp(current: THREE.Vector3, target: THREE.Vector3, velocity: THREE.Vector3, smoothTime: number, dt: number) {
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  change.subVectors(current, target);
  temp.copy(velocity).addScaledVector(change, omega).multiplyScalar(dt);
  velocity.addScaledVector(temp, -omega).multiplyScalar(decay);
  current.copy(target).add(change.add(temp).multiplyScalar(decay));
}

// Map-like follow camera: north-facing, fixed pitch, smoothed, with look-ahead.
// It also owns the diorama vista: the same view pulled far back along its line.
export function FollowCamera({ target }: FollowCameraProps) {
  const camera = useRef<THREE.PerspectiveCamera>(null);
  const focus = useRef<THREE.Vector3 | null>(null);
  const ahead = useRef(new THREE.Vector3());
  const focusVelocity = useRef(new THREE.Vector3());
  // Eased 0..1 progress toward the open panel's target, remembered on close so
  // the return glides back from where it was.
  const panel = useRef({ progress: 0, x: 0, z: 0, tour: false });
  // Vista progress 0 (play) .. 1 (vista); starts in the vista for the arrival shot.
  const vista = useRef({ progress: 1, introTime: 0 });
  // Taller-than-wide screens pull back in proportion, up to portraitZoomOut on
  // phones, so the robot stays readable and the paths stay framed.
  const pullback = useThree((state) => {
    const aspect = state.size.width / state.size.height;
    return aspect >= 1 ? 1 : Math.min(1 + (1 - aspect) * 0.65, CAMERA.portraitZoomOut);
  });
  const wide = useThree((state) => state.size.width >= 900);
  const narrow = useThree((state) => state.size.width < 640);

  useFrame((state, delta) => {
    const cam = camera.current;
    const object = target.current;
    if (!cam || !object) return;
    const dt = Math.min(delta, 0.1);

    // Physics steps first (see World), so the player's transform is current.
    object.updateWorldMatrix(true, false);
    object.getWorldPosition(goal);
    goal.y += LOOK_HEIGHT;

    // Look ahead in the walking direction, scaled by how fast the player moves.
    const v = runtime.player.velocity;
    const speed = Math.hypot(v.x, v.z);
    if (speed > 0.3) {
      desiredAhead.set(v.x, 0, v.z).multiplyScalar((CAMERA.lookAhead * Math.min(speed / PLAYER.speed, 1)) / speed);
    } else {
      desiredAhead.set(0, 0, 0);
    }
    ahead.current.lerp(desiredAhead, damp(CAMERA.lookAheadSpeed, dt));
    goal.add(ahead.current);

    const { active, vistaRequested, guidedTour } = useWorldStore.getState();
    const reduced = runtime.reducedMotion;
    const opened = active ? INTERACTABLE_BY_KEY.get(targetKey(active)) : undefined;
    const tourStop = guidedTour?.phase === "touring" && guidedTour.arrived ? TOUR_STOPS[guidedTour.stop] : undefined;
    const focusPoint = opened?.position ?? tourStop?.focus;
    const pf = panel.current;
    if (focusPoint) {
      [pf.x, pf.z] = focusPoint;
      pf.tour = !opened;
    }
    pf.progress = THREE.MathUtils.clamp(pf.progress + (focusPoint ? dt / PANEL_IN : -dt / PANEL_OUT), 0, 1);
    const pe = reduced ? (focusPoint ? 1 : 0) : smootherstep(pf.progress);
    if (pe > 0) {
      goal.lerp(zoneCentre.set(pf.x, LOOK_HEIGHT, pf.z), (pf.tour ? TOUR_PULL : ZONE_PULL) * pe);
      if (!pf.tour && wide) goal.x += PANEL_SHIFT * pe;
      if (!pf.tour && narrow) goal.z += SHEET_SHIFT * pe;
    }
    const zoom = THREE.MathUtils.lerp(1, pf.tour ? TOUR_ZOOM : CAMERA.focusZoom, pe);

    if (!focus.current || runtime.camera.snap) {
      // First frame and fast travel: cut straight to the player.
      focus.current = (focus.current ?? new THREE.Vector3()).copy(goal);
      focusVelocity.current.set(0, 0, 0);
      ahead.current.set(0, 0, 0);
      runtime.camera.snap = false;
    } else {
      smoothDamp(focus.current, goal, focusVelocity.current, CAMERA.followSmooth, dt);
    }

    // Vista only on arrival (until the hold ends or the player moves) or when
    // requested from the menu. Idling never pulls the camera back.
    const vs = vista.current;
    vs.introTime += dt;
    const arriving = !runtime.player.hasMoved && vs.introTime < VISTA.introHold;
    const wantVista = arriving || vistaRequested;
    // Reduced motion: the vista cuts in and out instead of gliding.
    vs.progress = reduced
      ? Number(wantVista)
      : THREE.MathUtils.clamp(vs.progress + ((wantVista ? 1 : -1) * dt) / VISTA.duration, 0, 1);
    const t = smootherstep(vs.progress);

    const playDistance = CAMERA.distance * zoom * pullback;
    const distance = THREE.MathUtils.lerp(playDistance, VISTA.distance, t);
    blended.lerpVectors(focus.current, VISTA_FOCUS, t);

    cam.position.copy(OFFSET_DIR).multiplyScalar(distance).add(blended);
    cam.lookAt(blended);

    const ratio = distance / CAMERA.distance;
    setPoint(runtime.camera.focus, blended.x, blended.y, blended.z);
    runtime.camera.ratio = ratio;
    const fog = state.scene.fog;
    if (fog instanceof THREE.Fog) {
      fog.near = FOG.near * ratio;
      fog.far = FOG.far * ratio;
    }
  });

  return <PerspectiveCamera ref={camera} makeDefault fov={CAMERA.fov} near={2} far={420} />;
}
