import * as THREE from "three";
import { PALETTE, TONES, WORLD } from "@/config/world";
import { createRandom } from "@/lib/random";
import { PATHS, PLAZA_RADIUS, pointOnCurve } from "@/lib/paths";
import { CLEARINGS, LAYOUT } from "@/lib/layout";

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d")!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function cached<T>(create: () => T) {
  let value: T | undefined;
  return () => (value ??= create());
}

// Soft round falloff, used for additive "fake bloom" halos.
export const getGlowTexture = cached(() =>
  canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }),
);

function verticalFade(brightAtBottom: boolean) {
  return canvasTexture(4, 128, (ctx) => {
    const g = brightAtBottom ? ctx.createLinearGradient(0, 128, 0, 0) : ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 128);
  });
}

// Bright at the bottom, fading toward the top: light pillars.
export const getFadeTexture = cached(() => verticalFade(true));
// Bright at the top (a cone's tip), fading toward the base: light beams.
export const getBeamTexture = cached(() => verticalFade(false));

// Parsed by hand: THREE.Color would convert to linear space, and the canvas
// expects plain sRGB, so painted colours would come out too dark.
function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// Hand-painted look for the whole world in one modest texture: soft patches,
// meadow tint under the grass, worn paths and the plaza paving. `pixels` is the
// texture's size (1024 on phones, 2048 on desktop for crisper edges).
export function paintGroundTexture(pixels = 1024) {
  const half = WORLD.groundHalf;
  const scale = pixels / (half * 2);
  const px = (x: number) => (x + half) * scale;
  const pz = (z: number) => (z + half) * scale;
  const rng = createRandom(WORLD.seed + 7);

  const blob = (ctx: CanvasRenderingContext2D, x: number, z: number, r: number, color: string, alpha: number) => {
    const g = ctx.createRadialGradient(px(x), pz(z), 0, px(x), pz(z), r * scale);
    g.addColorStop(0, hexToRgba(color, alpha));
    g.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px(x), pz(z), r * scale, 0, Math.PI * 2);
    ctx.fill();
  };

  const texture = canvasTexture(pixels, pixels, (ctx) => {
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, 0, pixels, pixels);

    // Large organic patches, darker and lighter.
    for (let i = 0; i < 70; i++) {
      const x = rng.range(-half, half);
      const z = rng.range(-half, half);
      const dark = rng.next() < 0.55;
      blob(ctx, x, z, rng.range(4, 13), dark ? PALETTE.path : TONES.groundLight, dark ? 0.35 : 0.45);
    }

    // Green-gold wash under every grass tuft, so meadows read as meadows from
    // far away and the sand between them as worn ground.
    for (const g of LAYOUT.grass) {
      blob(ctx, g.position[0], g.position[2], 2, PALETTE.foliageLight, 0.065);
    }
    for (const f of LAYOUT.flowers) {
      blob(ctx, f.position[0], f.position[2], 2.2, PALETTE.amber, 0.05);
    }

    // Shore: lighter sand along the south edge.
    const shore = ctx.createLinearGradient(0, pz(WORLD.boundary - 2), 0, pz(WORLD.shoreZ + 1));
    shore.addColorStop(0, hexToRgba(TONES.groundLight, 0));
    shore.addColorStop(1, hexToRgba(TONES.foam, 0.8));
    ctx.fillStyle = shore;
    ctx.fillRect(0, pz(WORLD.boundary - 2), pixels, pixels);

    // Worn ground at each landmark.
    for (const c of CLEARINGS.slice(1)) blob(ctx, c.x, c.z, c.r * 0.8, PALETTE.path, 0.55);

    // Paths: a soft wide underlay, a darker trodden edge, then the core and
    // scuffs along it.
    ctx.lineCap = "round";
    for (const [width, alpha, colour] of [
      [1.5, 0.35, PALETTE.path],
      [1.12, 0.45, TONES.pathDark],
      [1, 0.92, PALETTE.path],
    ] as const) {
      for (const c of PATHS) {
        ctx.strokeStyle = hexToRgba(colour, alpha);
        ctx.lineWidth = c.width * width * scale;
        ctx.beginPath();
        ctx.moveTo(px(c.from[0]), pz(c.from[1]));
        ctx.quadraticCurveTo(px(c.control[0]), pz(c.control[1]), px(c.to[0]), pz(c.to[1]));
        ctx.stroke();
      }
    }
    for (const c of PATHS) {
      for (let i = 0; i < 40; i++) {
        const [x, z] = pointOnCurve(c, rng.next());
        const o = (c.width / 2) * 0.8;
        blob(ctx, x + rng.range(-o, o), z + rng.range(-o, o), rng.range(0.3, 0.8), TONES.pathDark, 0.2);
      }
    }

    // Plaza paving: a filled disc with two cream rings.
    blob(ctx, 0, 0, PLAZA_RADIUS + 3, PALETTE.path, 0.5);
    ctx.fillStyle = PALETTE.path;
    ctx.beginPath();
    ctx.arc(px(0), pz(0), PLAZA_RADIUS * scale, 0, Math.PI * 2);
    ctx.fill();
    // Paving: rings of laid stones, each ring offset from the last, with a
    // lighter centre where the AI Core stands.
    for (let ring = 0; ring < 5; ring++) {
      const r0 = 1.6 + ring * 1.25;
      const r1 = r0 + 1.05;
      const stones = Math.round(((r0 + r1) / 2) * 3.4);
      for (let i = 0; i < stones; i++) {
        const a0 = ((i + (ring % 2) * 0.5) / stones) * Math.PI * 2 + 0.03;
        const a1 = a0 + (Math.PI * 2) / stones - 0.06;
        const shade = rng.next();
        ctx.fillStyle = hexToRgba(shade < 0.5 ? TONES.pathDark : TONES.groundLight, 0.1 + rng.next() * 0.12);
        ctx.beginPath();
        ctx.arc(px(0), pz(0), (r1 - 0.06) * scale, a0, a1);
        ctx.arc(px(0), pz(0), (r0 + 0.06) * scale, a1, a0, true);
        ctx.closePath();
        ctx.fill();
      }
    }
    blob(ctx, 0, 0, 3.2, TONES.groundLight, 0.4);
    ctx.strokeStyle = hexToRgba(PALETTE.text, 0.55);
    for (const [r, w] of [[PLAZA_RADIUS - 0.6, 0.18], [PLAZA_RADIUS - 1.1, 0.08]]) {
      ctx.lineWidth = w * scale;
      ctx.beginPath();
      ctx.arc(px(0), pz(0), r * scale, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  texture.anisotropy = 4;
  return texture;
}
