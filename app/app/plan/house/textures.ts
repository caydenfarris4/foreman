// Procedural materials for the 3D house — the "videogame trick" that buys
// realism for almost no download size. Every texture here is drawn to a small
// canvas on the device (≈0 network bytes) and reused. We pair each colour map
// with a grayscale BUMP map so surfaces catch light (plank grain, shingle
// rows, lap siding, brick courses) without any extra geometry.
//
// Client-only (House3D is dynamically imported with ssr:false), so `document`
// is always available here.
import * as THREE from "three";

const cache = new Map<string, THREE.CanvasTexture>();

type Draw = (ctx: CanvasRenderingContext2D, size: number) => void;

function make(
  key: string,
  size: number,
  draw: Draw,
  opts: { srgb?: boolean; repeat?: [number, number] } = {},
): THREE.CanvasTexture {
  const cached = cache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  tex.colorSpace = opts.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

// Cheap deterministic noise so textures don't shimmer between renders.
function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function fill(ctx: CanvasRenderingContext2D, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
}

// ---- Wood (door, trim, fascia) --------------------------------------------

export function woodColor(quality: number) {
  const size = quality;
  return make(
    `wood-c-${size}`,
    size,
    (ctx, s) => {
      fill(ctx, s, "#8E6529");
      const r = rng(7);
      for (let i = 0; i < s * 0.9; i++) {
        const y = r() * s;
        ctx.strokeStyle = `rgba(${60 + r() * 40},${40 + r() * 30},20,${0.05 + r() * 0.12})`;
        ctx.lineWidth = 0.6 + r() * 1.4;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(s * 0.33, y + (r() - 0.5) * 6, s * 0.66, y + (r() - 0.5) * 6, s, y);
        ctx.stroke();
      }
    },
    { srgb: true, repeat: [1, 1] },
  );
}

export function woodBump(quality: number) {
  const size = quality;
  return make(`wood-b-${size}`, size, (ctx, s) => {
    fill(ctx, s, "#808080");
    const r = rng(7);
    for (let i = 0; i < s * 0.9; i++) {
      const y = r() * s;
      ctx.strokeStyle = `rgba(${r() > 0.5 ? 40 : 210},${r() > 0.5 ? 40 : 210},${r() > 0.5 ? 40 : 210},0.4)`;
      ctx.lineWidth = 0.6 + r() * 1.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(s * 0.33, y + (r() - 0.5) * 6, s * 0.66, y + (r() - 0.5) * 6, s, y);
      ctx.stroke();
    }
  });
}

// ---- Shingles (roof) -------------------------------------------------------

function drawShingles(
  ctx: CanvasRenderingContext2D,
  s: number,
  mode: "color" | "bump",
) {
  const rows = 9;
  const cols = 9;
  const rh = s / rows;
  const cw = s / cols;
  const r = rng(21);
  fill(ctx, s, mode === "color" ? "#7A4F22" : "#9a9a9a");
  for (let row = 0; row < rows; row++) {
    const offset = row % 2 ? cw / 2 : 0;
    for (let col = -1; col < cols; col++) {
      const x = col * cw + offset;
      const y = row * rh;
      if (mode === "color") {
        const tone = 0.82 + r() * 0.3;
        ctx.fillStyle = `rgb(${Math.round(150 * tone)},${Math.round(95 * tone)},${Math.round(48 * tone)})`;
        ctx.fillRect(x + 0.5, y + 0.5, cw - 1, rh - 1);
        // weathering streak
        ctx.fillStyle = `rgba(40,25,12,${0.04 + r() * 0.08})`;
        ctx.fillRect(x + 0.5, y + rh * 0.6, cw - 1, rh * 0.4);
      } else {
        // raised tab with a dark shadow line under each course
        ctx.fillStyle = "#c8c8c8";
        ctx.fillRect(x + 0.5, y + 0.5, cw - 1, rh - 1);
        ctx.fillStyle = "#2a2a2a";
        ctx.fillRect(x, y + rh - 2, cw, 2);
        ctx.fillStyle = "#1f1f1f";
        ctx.fillRect(x, y, 1.4, rh);
      }
    }
  }
}

export function shingleColor(quality: number) {
  const size = quality;
  return make(`shingle-c-${size}`, size, (ctx, s) => drawShingles(ctx, s, "color"), {
    srgb: true,
    repeat: [3, 2],
  });
}

export function shingleBump(quality: number) {
  const size = quality;
  return make(`shingle-b-${size}`, size, (ctx, s) => drawShingles(ctx, s, "bump"), {
    repeat: [3, 2],
  });
}

// ---- Lap siding (walls) ----------------------------------------------------

function drawSiding(
  ctx: CanvasRenderingContext2D,
  s: number,
  mode: "color" | "bump",
) {
  const boards = 10;
  const bh = s / boards;
  fill(ctx, s, mode === "color" ? "#ECE6DA" : "#b4b4b4");
  for (let i = 0; i <= boards; i++) {
    const y = i * bh;
    if (mode === "color") {
      // soft top highlight + groove shadow → lapped boards
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(0, y, s, 1.5);
      ctx.fillStyle = "rgba(26,24,22,0.10)";
      ctx.fillRect(0, y - 2.5, s, 2.5);
    } else {
      ctx.fillStyle = "#f2f2f2";
      ctx.fillRect(0, y, s, 1.5);
      ctx.fillStyle = "#404040";
      ctx.fillRect(0, y - 3, s, 3);
    }
  }
}

export function sidingColor(quality: number) {
  const size = quality;
  return make(`siding-c-${size}`, size, (ctx, s) => drawSiding(ctx, s, "color"), {
    srgb: true,
    repeat: [3, 3],
  });
}

export function sidingBump(quality: number) {
  const size = quality;
  return make(`siding-b-${size}`, size, (ctx, s) => drawSiding(ctx, s, "bump"), {
    repeat: [3, 3],
  });
}

// ---- Brick (chimney, foundation) ------------------------------------------

function drawBrick(
  ctx: CanvasRenderingContext2D,
  s: number,
  mode: "color" | "bump",
) {
  const rows = 8;
  const bh = s / rows;
  const bw = s / 4;
  const r = rng(99);
  fill(ctx, s, mode === "color" ? "#7d4a3a" : "#3a3a3a"); // mortar
  for (let row = 0; row < rows; row++) {
    const offset = row % 2 ? bw / 2 : 0;
    const y = row * bh;
    for (let col = -1; col < 5; col++) {
      const x = col * bw + offset;
      if (mode === "color") {
        const tone = 0.85 + r() * 0.3;
        ctx.fillStyle = `rgb(${Math.round(150 * tone)},${Math.round(70 * tone)},${Math.round(52 * tone)})`;
        ctx.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
      } else {
        ctx.fillStyle = "#cfcfcf";
        ctx.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
      }
    }
  }
}

export function brickColor(quality: number) {
  const size = quality;
  return make(`brick-c-${size}`, size, (ctx, s) => drawBrick(ctx, s, "color"), {
    srgb: true,
    repeat: [1, 2],
  });
}

export function brickBump(quality: number) {
  const size = quality;
  return make(`brick-b-${size}`, size, (ctx, s) => drawBrick(ctx, s, "bump"), {
    repeat: [1, 2],
  });
}

// A tiny equirectangular sky→ground gradient used as the scene environment so
// PBR materials pick up soft specular reflections — no HDR download.
export function envTexture() {
  const cached = cache.get("env");
  if (cached) return cached;
  const w = 64;
  const h = 32;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#dfeaf5");
  grad.addColorStop(0.5, "#eef3f8");
  grad.addColorStop(0.5, "#cdbfa8");
  grad.addColorStop(1, "#9c8e78");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cache.set("env", tex);
  return tex;
}

export function disposeTextures() {
  cache.forEach((t) => t.dispose());
  cache.clear();
}
