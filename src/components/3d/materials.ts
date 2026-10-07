import * as THREE from "three";
import { getGlowTexture } from "@/lib/textures";

// Shared, cached materials. Reusing instances keeps shader programs and state
// changes to a minimum. Never mutate a cached material; use the `create*`
// variants for anything animated per object.

const cache = new Map<string, THREE.Material>();

function cached<T extends THREE.Material>(key: string, create: () => T): T {
  let m = cache.get(key);
  if (!m) {
    m = create();
    cache.set(key, m);
  }
  return m as T;
}

// Flat-shaded, fully rough: the base look of every solid object.
export function matte(color: string) {
  return cached(`matte:${color}`, () => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 }));
}

// White matte for instanced meshes that carry per-instance colour.
export function instancedMatte() {
  return cached("instanced", () => new THREE.MeshStandardMaterial({ flatShading: true, roughness: 1 }));
}

// Self-lit surface (lantern glass, screens, crystals) that ignores shadowing.
export function glow(color: string, intensity = 1.4) {
  return cached(`glow:${color}:${intensity}`, () => createGlow(color, intensity));
}

export function createGlow(color: string, intensity = 1.4) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    flatShading: true,
    roughness: 0.4,
  });
}

// Unlit, no depth write: halos, rings, beams, screens. Additive suits warm glows
// and anything over dark water; over bright sand it washes out to white, so cyan
// elements pass `additive = false` to keep their colour.
export function createAdditive(
  color: string,
  opacity = 1,
  map: THREE.Texture | null = getGlowTexture(),
  additive = true,
) {
  return new THREE.MeshBasicMaterial({
    color,
    map,
    transparent: true,
    opacity,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });
}

export function additive(color: string, opacity = 1) {
  return cached(`additive:${color}:${opacity}`, () => createAdditive(color, opacity));
}

// Camera-facing glow for sprites (fake bloom). See createAdditive on `additive`.
export function halo(color: string, opacity = 1, additive = true) {
  return cached(
    `halo:${color}:${opacity}:${additive}`,
    () =>
      new THREE.SpriteMaterial({
        color,
        map: getGlowTexture(),
        transparent: true,
        opacity,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false,
      }),
  );
}

// Lazily created, module-level value for one-of-a-kind landmarks whose materials
// are animated in useFrame. Call the returned getter wherever the value is needed.
export function singleton<T>(create: () => T) {
  let value: T | undefined;
  return () => (value ??= create());
}
