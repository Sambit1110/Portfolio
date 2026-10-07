import { useRef } from "react";
import type * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { useWorldStore } from "@/stores/worldStore";
import { PHYSICS } from "@/config/world";
import { Atmosphere } from "./Atmosphere";
import { AudioDriver } from "./AudioDriver";
import { Boundaries } from "./Boundaries";
import { FollowCamera } from "./Camera";
import { Environment } from "./Environment";
import { Ground } from "./Ground";
import { Lights } from "./Lights";
import { InteractionTracker } from "./interaction/InteractionTracker";
import { DustTrail } from "./player/DustTrail";
import { Player } from "./player/Player";
import { Sparkles } from "./Sparkles";
import { TourDriver } from "./TourDriver";
import { WindDriver } from "./WindDriver";


// Tells the UI the world has drawn its first frame, so the load veil can lift.
function ReadySignal() {
  const sent = useRef(false);
  useFrame(() => {
    if (sent.current) return;
    sent.current = true;
    useWorldStore.getState().setWorldReady();
  });
  return null;
}

export function World() {
  const player = useRef<THREE.Group>(null);

  return (
    <>
      <Lights />
      {/* Negative priority: step physics before the player and camera frame
          callbacks, so they always read this frame's positions. */}
      <Physics gravity={[...PHYSICS.gravity]} updatePriority={-1}>
        <Ground />
        <Boundaries />
        <Environment />
        <Player ref={player} />
      </Physics>
      <DustTrail />
      <Atmosphere />
      <Sparkles />
      <WindDriver />
      <ReadySignal />
      <AudioDriver />
      <InteractionTracker />
      <TourDriver />
      <FollowCamera target={player} />
    </>
  );
}
