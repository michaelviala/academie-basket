/** Tableau blanc : types, constantes et nettoyage des données (fonctions pures, utilisables côté client et serveur). */

export const WB_EDIT_ROLES = ["admin", "directeur_sportif", "coach"];

export type Court = "half" | "full";
export type Theme = "parquet" | "sombre" | "blanc";
export type Pt = [number, number];
export type LineStyle = "move" | "pass" | "dribble" | "screen";

export type WbEl =
  | { id: string; k: "att" | "def"; n: string; x: number; y: number }
  | { id: string; k: "ball" | "cone"; x: number; y: number }
  | { id: string; k: "line"; s: LineStyle; c: string; a: Pt; b: Pt }
  | { id: string; k: "pen"; c: string; pts: Pt[] }
  | { id: string; k: "zone"; c: string; x: number; y: number; rx: number; ry: number }
  | { id: string; k: "text"; c: string; x: number; y: number; txt: string };

export type WbPage = { id: string; title: string; note: string; els: WbEl[] };

/** Dimensions du terrain (unités de dessin : 1 unité = 10 cm). Demi-terrain : panier en haut. Terrain complet : en largeur. */
export const DIMS: Record<Court, { w: number; h: number }> = {
  half: { w: 150, h: 140 },
  full: { w: 280, h: 150 },
};

export const COLORS = ["#ffd23f", "#ffffff", "#e5171b", "#3ba7ff", "#3bd16f", "#111111"] as const;

export const THEMES: Record<
  Theme,
  { label: string; out: string; floor: string; line: string; paint: string; defFill: string; defStroke: string; defText: string; ink: string }
> = {
  parquet: { label: "Parquet", out: "#caa56b", floor: "#e6c690", line: "#3a2a12", paint: "rgba(180,40,30,.28)", defFill: "#ffffff", defStroke: "#3a2a12", defText: "#3a2a12", ink: "#1b3a8a" },
  sombre: { label: "Sombre", out: "#161d27", floor: "#1b2431", line: "#e8ebf2", paint: "rgba(229,23,27,.22)", defFill: "#0f1015", defStroke: "#e8ebf2", defText: "#e8ebf2", ink: "#ffd23f" },
  blanc: { label: "Blanc", out: "#f1f1f4", floor: "#ffffff", line: "#2b2d36", paint: "rgba(229,23,27,.10)", defFill: "#ffffff", defStroke: "#2b2d36", defText: "#2b2d36", ink: "#1b3a8a" },
};

export const TOOL_LABELS = {
  select: "Déplacer",
  att: "Attaquant",
  def: "Défenseur",
  ball: "Ballon",
  cone: "Plot",
  move: "Trajet",
  pass: "Passe",
  dribble: "Dribble",
  screen: "Écran",
  pen: "Crayon",
  zone: "Zone",
  text: "Texte",
  erase: "Gomme",
} as const;
export type Tool = keyof typeof TOOL_LABELS;

export const newId = () => Math.random().toString(36).slice(2, 10);

export const emptyPage = (n = 1): WbPage => ({ id: newId(), title: `Page ${n}`, note: "", els: [] });

const num = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v * 10) / 10)) : null;
const pt = (v: unknown, w: number, h: number): Pt | null => {
  if (!Array.isArray(v) || v.length < 2) return null;
  const x = num(v[0], 0, w);
  const y = num(v[1], 0, h);
  return x === null || y === null ? null : [x, y];
};
const col = (v: unknown) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : "#ffd23f");
const id = (v: unknown) => (typeof v === "string" && /^[\w-]{1,24}$/.test(v) ? v : newId());

/** Lit le JSON `pages` de la base en liste sûre (jamais d'exception). */
export function parsePages(raw: unknown, court: Court = "half"): WbPage[] {
  const { w, h } = DIMS[court];
  const pages: WbPage[] = [];
  if (Array.isArray(raw)) {
    for (const p of raw.slice(0, 30)) {
      const o = (p ?? {}) as Record<string, unknown>;
      const els: WbEl[] = [];
      if (Array.isArray(o.els)) {
        for (const e of o.els.slice(0, 400)) {
          const r = (e ?? {}) as Record<string, unknown>;
          const x = num(r.x, 0, w);
          const y = num(r.y, 0, h);
          if ((r.k === "att" || r.k === "def") && x !== null && y !== null)
            els.push({ id: id(r.id), k: r.k, n: String(r.n ?? "").slice(0, 3), x, y });
          else if ((r.k === "ball" || r.k === "cone") && x !== null && y !== null) els.push({ id: id(r.id), k: r.k, x, y });
          else if (r.k === "line") {
            const a = pt(r.a, w, h);
            const b = pt(r.b, w, h);
            const s = ["move", "pass", "dribble", "screen"].includes(r.s as string) ? (r.s as LineStyle) : "move";
            if (a && b) els.push({ id: id(r.id), k: "line", s, c: col(r.c), a, b });
          } else if (r.k === "pen" && Array.isArray(r.pts)) {
            const pts = r.pts.slice(0, 600).map((q) => pt(q, w, h)).filter((q): q is Pt => !!q);
            if (pts.length >= 2) els.push({ id: id(r.id), k: "pen", c: col(r.c), pts });
          } else if (r.k === "zone" && x !== null && y !== null) {
            const rx = num(r.rx, 1, w);
            const ry = num(r.ry, 1, h);
            if (rx !== null && ry !== null) els.push({ id: id(r.id), k: "zone", c: col(r.c), x, y, rx, ry });
          } else if (r.k === "text" && x !== null && y !== null && typeof r.txt === "string" && r.txt.trim())
            els.push({ id: id(r.id), k: "text", c: col(r.c), x, y, txt: r.txt.slice(0, 80) });
        }
      }
      pages.push({
        id: id(o.id),
        title: typeof o.title === "string" ? o.title.slice(0, 80) : `Page ${pages.length + 1}`,
        note: typeof o.note === "string" ? o.note.slice(0, 2000) : "",
        els,
      });
    }
  }
  return pages.length ? pages : [emptyPage()];
}

/** Change de terrain en gardant les positions relatives. */
export function rescalePages(pages: WbPage[], from: Court, to: Court): WbPage[] {
  const fx = DIMS[to].w / DIMS[from].w;
  const fy = DIMS[to].h / DIMS[from].h;
  const p = (q: Pt): Pt => [Math.round(q[0] * fx * 10) / 10, Math.round(q[1] * fy * 10) / 10];
  return pages.map((pg) => ({
    ...pg,
    els: pg.els.map((e) => {
      switch (e.k) {
        case "line": return { ...e, a: p(e.a), b: p(e.b) };
        case "pen": return { ...e, pts: e.pts.map(p) };
        case "zone": return { ...e, x: e.x * fx, y: e.y * fy, rx: e.rx * fx, ry: e.ry * fy };
        default: { const [x, y] = p([e.x, e.y]); return { ...e, x, y }; }
      }
    }),
  }));
}
