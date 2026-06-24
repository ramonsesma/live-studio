// Generates assets/demo-mix-radar.gif — an animated demo of the Resonance Mix Radar:
// the "Listen" sweep fills the frequency×track spectrum, masking collisions light up red,
// then a corrective carve resolves one. Frames are drawn as raw RGB24 and encoded by ffmpeg.
// Run: npx tsx scripts/make-demo-gif.ts
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const W = 600, H = 344, FPS = 15, NB = 30, ROWS = 6;
const px = new Uint8Array(W * H * 3);
function set(x: number, y: number, r: number, g: number, b: number) {
  x = x | 0; y = y | 0; if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 3; px[o] = r; px[o + 1] = g; px[o + 2] = b;
}
function rect(x: number, y: number, w: number, h: number, c: number[]) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c[0], c[1], c[2]);
}
function clear(c: number[]) { for (let i = 0; i < W * H; i++) { px[i * 3] = c[0]; px[i * 3 + 1] = c[1]; px[i * 3 + 2] = c[2]; } }
function cell(v: number): number[] {
  if (v < 0.05) return [28, 39, 64];
  if (v < 0.45) { const k = v / 0.45; return [35 + k * 73, 64 + k * 134, 107 + k * 148].map(Math.round); }
  if (v < 0.72) { const k = (v - 0.45) / 0.27; return [108 + k * 147, 198 - k * 19, 255 - k * 184].map(Math.round); }
  const k = (v - 0.72) / 0.28; return [255, 179 - k * 60, 71 - k * 30].map(Math.round);
}
function lerp(a: number[], b: number[], t: number) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

// --- synthetic spectra: Kick / Bass / Rhodes / Vocal / Hats / Pad ---
function bell(c: number, w: number, a: number, x: number) { return a * Math.exp(-Math.pow((x - c) / w, 2)); }
function baseEnergy(t: number, x: number) {
  if (t === 0) return bell(0.06, 0.07, 1, x) + bell(0.18, 0.05, 0.4, x);
  if (t === 1) return bell(0.12, 0.09, 0.92, x) + bell(0.30, 0.10, 0.7, x);
  if (t === 2) return bell(0.34, 0.13, 0.85, x) + bell(0.55, 0.10, 0.5, x);
  if (t === 3) return bell(0.42, 0.10, 0.8, x) + bell(0.66, 0.12, 0.72, x);
  if (t === 4) return bell(0.86, 0.10, 0.92, x) + bell(0.70, 0.10, 0.5, x);
  return bell(0.40, 0.30, 0.62, x) + bell(0.75, 0.25, 0.46, x);
}
const SPEC: number[][] = [];
for (let t = 0; t < ROWS; t++) { SPEC[t] = []; for (let b = 0; b < NB; b++) SPEC[t][b] = Math.min(1, baseEnergy(t, b / (NB - 1))); }
const COLL: number[][] = [];
for (let b = 0; b < NB; b++) { const hot: number[] = []; for (let t = 0; t < ROWS; t++) if (SPEC[t][b] > 0.6) hot.push(t); COLL[b] = hot.length >= 2 ? hot : []; }
const TRACK_COL = [[255, 179, 71], [108, 198, 255], [199, 146, 234], [255, 117, 151], [240, 198, 116], [130, 219, 202]];

// --- header radar glyph (no font): rings + rotating sweep ---
function radar(cx: number, cy: number, frame: number) {
  for (let rr = 6; rr <= 14; rr += 4) for (let a = 0; a < 360; a += 4) { const rad = (a * Math.PI) / 180; set(cx + Math.cos(rad) * rr, cy + Math.sin(rad) * rr, 90, 110, 130); }
  const sa = ((frame * 9) % 360) * Math.PI / 180;
  for (let rr = 0; rr <= 14; rr++) set(cx + Math.cos(sa) * rr, cy + Math.sin(sa) * rr, 108, 198, 255);
  rect(cx - 2, cy - 2, 4, 4, [108, 198, 255]);
}

const GX = 150, GW = W - GX - 184, GY = 64, ROWH = 34, CW = GW / NB;

function frame(f: number, total: number) {
  clear([19, 19, 26]);
  rect(0, 0, W, 44, [22, 22, 27]);          // header bar
  rect(0, 44, W, 1, [56, 56, 63]);
  radar(26, 22, f);
  rect(150, 14, 150, 5, [232, 179, 71]);    // title block (brand mark, fontless)
  rect(150, 23, 96, 4, [120, 120, 130]);

  // phases
  const tShow = Math.min(1, Math.max(0, (f - 4) / (total * 0.45)));  // sweep fill 0..1
  const sweepCol = Math.floor(tShow * NB);
  const carvePhase = Math.min(1, Math.max(0, (f - total * 0.66) / (total * 0.18)));
  const pulse = 0.5 + 0.5 * Math.sin(f * 0.5);

  rect(GX, GY - 18, GW, 12, [19, 19, 26]);
  for (let t = 0; t < ROWS; t++) {
    // left meter bar
    const lvl = SPEC[t].reduce((a, b) => a + b, 0) / NB;
    const my = GY + t * ROWH + 8;
    rect(40, my, 96, ROWH - 12, [32, 32, 38]);
    rect(40, my, Math.round(96 * Math.min(1, lvl * 2.3) * tShow), ROWH - 12, TRACK_COL[t]);

    for (let b = 0; b < NB; b++) {
      const x = GX + b * CW, y = GY + t * ROWH + 6, w = CW - 1.6, h = ROWH - 4;
      let c: number[];
      if (b > sweepCol) c = [22, 24, 34];
      else {
        const v = SPEC[t][b];
        const isColl = COLL[b].includes(t);
        if (isColl) {
          // collision: red, pulsing; carve resolves the loudest member's band
          const loudest = COLL[b].slice().sort((p, q) => SPEC[q][b] - SPEC[p][b])[0];
          if (t === loudest && carvePhase > 0) c = lerp([226, 75, 74], cell(v * (1 - 0.55 * carvePhase)), carvePhase);
          else c = lerp([150, 40, 40], [226, 75, 74], pulse);
        } else c = cell(v);
      }
      rect(x, y, w, h, c);
    }
  }
  // sweep scan line
  if (sweepCol < NB && tShow < 1) { const sx = GX + sweepCol * CW; rect(sx, GY, 2, ROWS * ROWH, [108, 198, 255]); }

  // right "moves" cards appear after sweep
  if (tShow >= 1) {
    const moves = [[226, 75, 74], [232, 179, 71], [199, 146, 234]];
    for (let i = 0; i < moves.length; i++) {
      const my = GY + i * 40, mx = W - 176;
      rect(mx, my, 164, 32, [26, 26, 32]); rect(mx, my, 3, 32, moves[i]);
      rect(mx + 12, my + 9, 110, 5, [180, 180, 190]);
      const applied = carvePhase > 0.6 && i === 0;
      rect(mx + 12, my + 19, 40, 7, applied ? [90, 209, 122] : [232, 179, 71]);
    }
  }

  // bottom energy lane
  const secs = [0.25, 0.5, 0.95, 0.3, 1, 0.2], wts = [10, 22, 24, 10, 24, 10];
  const tot = wts.reduce((a, b) => a + b, 0); let ex = GX;
  for (let i = 0; i < secs.length; i++) { const w = (wts[i] / tot) * GW, e = secs[i]; rect(Math.round(ex), GY + ROWS * ROWH + 14, Math.round(w - 2), 22, [Math.round(60 + e * 195), Math.round(200 - e * 120), Math.round(160 - e * 120)]); ex += w; }
  return Buffer.from(px);
}

const total = Math.round(FPS * 5.4);
const dir = mkdtempSync(join(tmpdir(), "radar-"));
const raw = join(dir, "frames.rgb");
const chunks: Buffer[] = [];
for (let f = 0; f < total; f++) chunks.push(frame(f, total));
writeFileSync(raw, Buffer.concat(chunks));

const out = join(process.cwd(), "assets", "demo-mix-radar.gif");
execFileSync("ffmpeg", ["-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${W}x${H}`, "-r", String(FPS), "-i", raw,
  "-filter_complex", "[0:v]split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=3", "-loop", "0", out],
  { stdio: ["ignore", "ignore", "inherit"] });
console.log("wrote", out);
