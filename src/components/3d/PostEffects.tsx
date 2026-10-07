import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

// Only light brighter than white glows: emissive cyan, lanterns, the fire and
// the lighthouse lamp. Lit surfaces, world text and the palette stay crisp.
const BLOOM = { strength: 0.55, radius: 0.5, threshold: 1.15 };

// Soft glow around the world's bright emissive surfaces. Renders the scene into
// a multisampled half-float target (so antialiasing and over-bright values
// survive), blooms it at half resolution, then outputs with the renderer's own
// colour space and tone mapping, so the locked palette is unchanged.
export function PostEffects() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const dpr = useThree((s) => s.viewport.dpr);

  const { composer, bloom } = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(gl, target);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    return { composer, bloom };
  }, [gl, scene, camera]);

  useEffect(() => {
    composer.setPixelRatio(dpr);
    composer.setSize(width, height);
    // The blur is soft by nature: half resolution looks the same for a quarter of the cost.
    bloom.resolution.set(width / 2, height / 2);
  }, [composer, bloom, width, height, dpr]);

  useEffect(() => () => composer.dispose(), [composer]);

  // A positive priority takes over rendering from R3F for this frame.
  useFrame((_, delta) => composer.render(delta), 1);
  return null;
}
