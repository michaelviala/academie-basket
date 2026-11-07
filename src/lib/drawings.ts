/* Dessins sur la vidéo — port de PIVOT (tele.js).
   Coordonnées 0..1 dans l'image ; le cercle garde `e:1` (rayons indépendants), le texte `z` (échelle). */

export type ShapeKind = "pen" | "arrow" | "run" | "screen" | "circle" | "cross" | "check" | "text";
export type Shape = { k: ShapeKind; c: string; p: [number, number][]; txt?: string; e?: number; z?: number };
export type Drawing = { id: string; t: number; dur: number; hold: number; shapes: Shape[] };
export type Rect = { x: number; y: number; w: number; h: number };

export const TOOLS: { k: ShapeKind | "move"; label: string; icon: string }[] = [
  { k: "move", label: "Sélectionner et déplacer (Suppr pour effacer l'élément)", icon: "M5 3l14 8-6 2-2 6z" },
  { k: "arrow", label: "Flèche (passe, direction)", icon: "M4 20L20 4M20 4h-8M20 4v8" },
  { k: "run", label: "Flèche pointillée (déplacement)", icon: "M4 20l3-3M10 14l3-3M16 8l4-4M20 4h-7M20 4v7" },
  { k: "circle", label: "Cercle (joueur, zone)", icon: "M12 4a8 8 0 100 16 8 8 0 000-16z" },
  { k: "cross", label: "Croix : mauvaise position", icon: "M6 6l12 12M18 6L6 18" },
  { k: "screen", label: "Écran (trait terminé par une barre en T)", icon: "M5 19L16 8M12 4l8 8" },
  { k: "pen", label: "Crayon (trait libre)", icon: "M4 20c4-1 6-6 9-9s5-5 7-7" },
  { k: "text", label: "Texte", icon: "M5 6h14M12 6v13" },
];
export const COLORS: [string, string][] = [
  ["#FF4D4D", "Rouge"], ["#3BD16F", "Vert"], ["#FFD23F", "Jaune"], ["#5AA9FF", "Bleu"], ["#FFFFFF", "Blanc"],
];
export const HOLDS: [number, string][] = [
  [0, "Aucun (la vidéo continue)"], [2, "2 s"], [3, "3 s"], [5, "5 s"], [8, "8 s"], [-1, "Jusqu'à la relance"],
];
const KINDS = new Set<string>(["pen", "arrow", "run", "screen", "circle", "cross", "check", "text"]);

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const round4 = (v: number) => +v.toFixed(4);
const N = (r: Rect, x: number, y: number): [number, number] => [round4(clamp((x - r.x) / r.w, 0, 1)), round4(clamp((y - r.y) / r.h, 0, 1))];

/** Nettoie des formes venant de la base ou du client. */
export function parseShapes(raw: unknown): Shape[] {
  if (!Array.isArray(raw)) return [];
  const out: Shape[] = [];
  for (const s of raw.slice(0, 100)) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    if (typeof o.k !== "string" || !KINDS.has(o.k) || !Array.isArray(o.p)) continue;
    const p = (o.p as unknown[])
      .slice(0, 400)
      .filter((q): q is [number, number] => Array.isArray(q) && typeof q[0] === "number" && typeof q[1] === "number")
      .map(([x, y]) => [round4(clamp(x, 0, 1)), round4(clamp(y, 0, 1))] as [number, number]);
    if (p.length === 0) continue;
    const c = typeof o.c === "string" && /^#[0-9a-fA-F]{6}$/.test(o.c) ? o.c : "#FFD23F";
    const shape: Shape = { k: o.k as ShapeKind, c, p };
    if (typeof o.txt === "string") shape.txt = o.txt.slice(0, 40);
    if (o.e === 1) shape.e = 1;
    if (typeof o.z === "number") shape.z = clamp(o.z, 0.4, 5);
    out.push(shape);
  }
  return out;
}

/** Zone réellement occupée par l'image dans le canevas. */
export function imageRect(canvas: HTMLCanvasElement, aspect: number): Rect {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  let w = W, h = W / aspect;
  if (h > H) { h = H; w = H * aspect; }
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}
function fit(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1, W = canvas.clientWidth, H = canvas.clientHeight;
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}
const P = (r: Rect, p: [number, number]): [number, number] => [r.x + p[0] * r.w, r.y + p[1] * r.h];

function ell(s: Shape, r: Rect): [number, number] {
  const a = s.p[0], b = s.p[s.p.length - 1] || a;
  if (s.e) return [Math.max(6, Math.abs(b[0] - a[0]) * r.w), Math.max(4, Math.abs(b[1] - a[1]) * r.h)];
  const rad = Math.max(8, Math.hypot((b[0] - a[0]) * r.w, (b[1] - a[1]) * r.h));
  return [rad, rad * 0.62];
}
function sz(s: Shape, r: Rect) {
  const a = s.p[0], b = s.p[s.p.length - 1] || a;
  return Math.max(s.p.length > 1 ? 8 : r.w / 26, Math.hypot((b[0] - a[0]) * r.w, (b[1] - a[1]) * r.h));
}
const fontSize = (s: Shape, r: Rect) => Math.max(10, (r.w / 34) * (s.z || 1));

function head(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, s: number) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45));
  ctx.lineTo(x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45));
  ctx.closePath();
  ctx.fill();
}

export function bbox(s: Shape, r: Rect, canvas: HTMLCanvasElement): Rect {
  const pts = s.p.map((p) => P(r, p)), a = pts[0];
  if (s.k === "circle") { const [rx, ry] = ell(s, r); return { x: a[0] - rx, y: a[1] - ry, w: rx * 2, h: ry * 2 }; }
  if (s.k === "cross" || s.k === "check") { const z = sz(s, r); return { x: a[0] - z * 1.1, y: a[1] - z, w: z * 2.3, h: z * 2 }; }
  if (s.k === "text") {
    const fs = fontSize(s, r), ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.font = `700 ${fs}px Figtree, sans-serif`;
    const tw = ctx.measureText(s.txt || "").width;
    ctx.restore();
    return { x: a[0] - 6, y: a[1] - fs * 0.75, w: tw + 12, h: fs * 1.5 };
  }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

type Handle = { id: string; x: number; y: number; round?: boolean };
function handles(s: Shape, r: Rect, canvas: HTMLCanvasElement): Handle[] {
  if (s.k === "arrow" || s.k === "run" || s.k === "screen") return s.p.map((p) => P(r, p)).map(([x, y], i) => ({ x, y, id: "p" + i, round: true }));
  const bb = bbox(s, r, canvas), m = 8;
  return ([["nw", bb.x - m, bb.y - m], ["ne", bb.x + bb.w + m, bb.y - m], ["sw", bb.x - m, bb.y + bb.h + m], ["se", bb.x + bb.w + m, bb.y + bb.h + m]] as const).map(([id, x, y]) => ({ id, x, y }));
}
export function handleAt(s: Shape, px: [number, number], r: Rect, canvas: HTMLCanvasElement): string | null {
  const h = handles(s, r, canvas).find((q) => Math.hypot(q.x - px[0], q.y - px[1]) < 12);
  return h ? h.id : null;
}

export function drawShapes(canvas: HTMLCanvasElement, aspect: number, shapes: Shape[] | null, selIdx: number | null = null) {
  const ctx = fit(canvas);
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  if (!shapes || !shapes.length) return;
  const r = imageRect(canvas, aspect), lw = Math.max(3, r.w / 220);
  shapes.forEach((s) => {
    ctx.save();
    ctx.strokeStyle = s.c; ctx.fillStyle = s.c; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(0,0,0,.65)"; ctx.shadowBlur = lw * 1.5;
    const pts = s.p.map((p) => P(r, p));
    if (!pts.length) { ctx.restore(); return; }
    const a = pts[0], b = pts[pts.length - 1];
    if (s.k === "pen") {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    } else if (s.k === "arrow" || s.k === "run") {
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 2) { ctx.restore(); return; }
      const hs = Math.max(lw * 4, 14), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const ex = b[0] - Math.cos(ang) * hs * 0.8, ey = b[1] - Math.sin(ang) * hs * 0.8;
      if (s.k === "run") ctx.setLineDash([lw * 2.6, lw * 2.2]);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.setLineDash([]);
      head(ctx, a[0], a[1], b[0], b[1], hs);
    } else if (s.k === "screen") {
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 2) { ctx.restore(); return; }
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), half = Math.max(lw * 6, 20);
      const nx = -Math.sin(ang) * half, ny = Math.cos(ang) * half;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      ctx.lineWidth = lw * 1.6;
      ctx.beginPath(); ctx.moveTo(b[0] + nx, b[1] + ny); ctx.lineTo(b[0] - nx, b[1] - ny); ctx.stroke();
    } else if (s.k === "circle") {
      const [rx, ry] = ell(s, r);
      ctx.beginPath(); ctx.ellipse(a[0], a[1], rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.18; ctx.fill();
    } else if (s.k === "cross" || s.k === "check") {
      const z = sz(s, r);
      ctx.lineWidth = lw * 1.8;
      ctx.beginPath();
      if (s.k === "cross") {
        ctx.moveTo(a[0] - z, a[1] - z); ctx.lineTo(a[0] + z, a[1] + z);
        ctx.moveTo(a[0] + z, a[1] - z); ctx.lineTo(a[0] - z, a[1] + z);
      } else {
        ctx.moveTo(a[0] - z, a[1]); ctx.lineTo(a[0] - z * 0.25, a[1] + z * 0.8); ctx.lineTo(a[0] + z * 1.1, a[1] - z * 0.9);
      }
      ctx.stroke();
    } else if (s.k === "text" && s.txt) {
      const fs = fontSize(s, r);
      ctx.font = `700 ${fs}px Figtree, sans-serif`; ctx.textBaseline = "middle";
      const tw = ctx.measureText(s.txt).width;
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(0,0,0,.62)"; ctx.fillRect(a[0] - 6, a[1] - fs * 0.75, tw + 12, fs * 1.5);
      ctx.fillStyle = s.c; ctx.fillText(s.txt, a[0], a[1]);
    }
    ctx.restore();
  });
  if (selIdx !== null && shapes[selIdx]) {
    const bb = bbox(shapes[selIdx], r, canvas);
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
    ctx.strokeRect(bb.x - 8, bb.y - 8, bb.w + 16, bb.h + 16);
    ctx.setLineDash([]);
    handles(shapes[selIdx], r, canvas).forEach((h) => {
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#111"; ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (h.round) ctx.arc(h.x, h.y, 7, 0, Math.PI * 2); else ctx.rect(h.x - 6, h.y - 6, 12, 12);
      ctx.fill(); ctx.stroke();
    });
    ctx.restore();
  }
}

/** Redimensionne `s` depuis la poignée `id` ; `o` = forme d'origine ; `px` = pointeur en pixels. */
export function resizeShape(s: Shape, o: Shape, id: string, px: [number, number], r: Rect, canvas: HTMLCanvasElement) {
  if (id[0] === "p") { s.p[+id.slice(1)] = N(r, px[0], px[1]); return; }
  const a = P(r, o.p[0]);
  if (s.k === "circle") {
    const rx = Math.max(6, Math.abs(px[0] - a[0]) - 8), ry = Math.max(4, Math.abs(px[1] - a[1]) - 8);
    s.e = 1; s.p = [[...o.p[0]], N(r, a[0] + rx, a[1] + ry)];
    return;
  }
  if (s.k === "cross" || s.k === "check") {
    const z = Math.max(8, Math.max(Math.abs(px[0] - a[0]), Math.abs(px[1] - a[1])) - 10);
    s.p = [[...o.p[0]], N(r, a[0] + z / Math.SQRT2, a[1] + z / Math.SQRT2)];
    return;
  }
  const bb = bbox(o, r, canvas), m = 8;
  const opp = ({ nw: [bb.x + bb.w, bb.y + bb.h], ne: [bb.x, bb.y + bb.h], sw: [bb.x + bb.w, bb.y], se: [bb.x, bb.y] } as Record<string, [number, number]>)[id];
  const w0 = Math.max(4, bb.w + m), h0 = Math.max(4, bb.h + m);
  const f = Math.max(0.2, Math.max(Math.abs(px[0] - opp[0]) / w0, Math.abs(px[1] - opp[1]) / h0));
  if (s.k === "text") {
    s.z = +clamp((o.z || 1) * f, 0.4, 5).toFixed(2);
    s.p = [N(r, opp[0] + (a[0] - opp[0]) * f, opp[1] + (a[1] - opp[1]) * f)];
    return;
  }
  s.p = o.p.map((q) => {
    const [x, y] = P(r, q);
    return N(r, opp[0] + (x - opp[0]) * f, opp[1] + (y - opp[1]) * f);
  });
}

function segDist(p: [number, number], a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
  const u = clamp(l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0, 0, 1);
  return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy);
}
/** Élément sous le pointeur (le plus récent d'abord) ; -1 si aucun. */
export function hitShape(shapes: Shape[], px: [number, number], r: Rect, canvas: HTMLCanvasElement): number {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i], pts = s.p.map((p) => P(r, p));
    if (s.k === "pen" || s.k === "arrow" || s.k === "run" || s.k === "screen") {
      for (let j = 1; j < pts.length; j++) if (segDist(px, pts[j - 1], pts[j]) < 14) return i;
      continue;
    }
    const bb = bbox(s, r, canvas);
    if (px[0] >= bb.x - 10 && px[0] <= bb.x + bb.w + 10 && px[1] >= bb.y - 10 && px[1] <= bb.y + bb.h + 10) return i;
  }
  return -1;
}
/** Dessin affiché à l'instant t (en pause : tolérance au début). */
export function activeDrawing(list: Drawing[], t: number, paused: boolean): Drawing | null {
  return list.find((d) => t >= d.t - (paused ? 0.12 : 0.001) && t <= d.t + d.dur) ?? null;
}
export const normPoint = N;
