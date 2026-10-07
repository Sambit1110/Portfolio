"use client";

import { useEffect, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { catchError } from "next/error";
import { useWorldStore } from "@/stores/worldStore";

// WebGL and Rapier's WASM only exist in the browser, so the scene skips prerendering.
const Experience = dynamic(() => import("./Experience"), { ssr: false });

// three.js renders with WebGL 2 only, so WebGL 1 alone can't run the world.
let webglSupport: boolean | undefined;
function supportsWebGL() {
  if (webglSupport === undefined) {
    try {
      webglSupport = Boolean(document.createElement("canvas").getContext("webgl2"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}

const noSubscribe = () => () => {};

// If the world fails anyway (the GPU refuses a context, a chunk or the physics
// WASM can't load, a runtime error in the scene), the visitor gets the HTML
// portfolio instead of a broken canvas.
function WorldUnavailable() {
  useEffect(() => useWorldStore.getState().disableWorld(), []);
  return null;
}
const WorldBoundary = catchError(() => <WorldUnavailable />);

export function ExperienceLoader() {
  // null on the server and during hydration; the real answer right after.
  const webgl = useSyncExternalStore(noSubscribe, supportsWebGL, () => null);

  useEffect(() => {
    // Without WebGL the portfolio is still fully available as HTML.
    if (webgl === false) useWorldStore.getState().disableWorld();
  }, [webgl]);

  if (!webgl) return null;
  // The 3D world is a visual layer; the same content lives in the HTML layer.
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <WorldBoundary>
        <Experience />
      </WorldBoundary>
    </div>
  );
}
