import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PALETTE } from "@/config/world";
import { QUALITY_SETTINGS } from "@/config/quality";
import { useDeviceStore } from "@/stores/deviceStore";
import { runtime } from "@/stores/runtime";

// Low golden-hour sun from the north-west, so shadows fall toward the bottom-right.
const SUN_OFFSET = new THREE.Vector3(-20, 18, -12);
// The shadow frustum follows the camera's focus and only covers what it can see,
// which keeps the shadow map (2048 on desktop) sharp in play. It widens with the
// camera in the vista.
const SHADOW_EXTENT = 24;

const focus = new THREE.Vector3();

export function Lights() {
  const sun = useRef<THREE.DirectionalLight>(null);
  const shadowMap = QUALITY_SETTINGS[useDeviceStore((s) => s.quality)].shadowMap;

  // Resize the shadow map when the quality tier changes (shadows stay on).
  useEffect(() => {
    const light = sun.current;
    if (!light || light.shadow.mapSize.x === shadowMap) return;
    light.shadow.mapSize.set(shadowMap, shadowMap);
    light.shadow.map?.dispose();
    light.shadow.map = null;
  }, [shadowMap]);
  const extent = useRef(SHADOW_EXTENT);

  useEffect(() => {
    // The light's target must be in the scene graph for its matrix to update.
    const light = sun.current;
    if (light) light.parent?.add(light.target);
  }, []);

  useFrame(() => {
    const light = sun.current;
    if (!light) return;

    const wanted = SHADOW_EXTENT * runtime.camera.ratio;
    if (Math.abs(wanted - extent.current) > extent.current * 0.02) {
      extent.current = wanted;
      const cam = light.shadow.camera;
      cam.left = cam.bottom = -wanted;
      cam.right = cam.top = wanted;
      cam.far = 80 * Math.max(1, runtime.camera.ratio);
      cam.updateProjectionMatrix();
    }

    // Snap to whole shadow texels so edges don't shimmer while walking.
    const texel = (extent.current * 2) / light.shadow.mapSize.x;
    focus.copy(runtime.camera.focus);
    focus.set(Math.round(focus.x / texel) * texel, 0, Math.round(focus.z / texel) * texel);
    light.target.position.copy(focus);
    light.position.copy(focus).add(SUN_OFFSET);
  });

  return (
    <>
      <fog attach="fog" args={["#E9CBA5", 50, 105]} />
      {/* Lavender sky fill: whatever the sun doesn't reach turns softly violet.
          Sun + fill are balanced so sunlit ground renders at its palette colour. */}
      <hemisphereLight args={["#CEC6F0", PALETTE.ground, 2.3]} />
      <directionalLight
        ref={sun}
        color="#FFF4B8"
        intensity={2.9}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
        shadow-camera-near={1}
        shadow-camera-far={80}
      />
    </>
  );
}
