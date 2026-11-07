/** Utilitaires partagés de la bibliothèque de systèmes (fonctions pures). */

export type TokenPosition = {
  label: string;
  x: number;
  y: number;
  /** Porteur du ballon dans cette séquence. */
  ball?: boolean;
  /** Le joueur pose un écran dans cette séquence. */
  screen?: boolean;
};

export const SYSTEM_EDIT_ROLES = ["admin", "directeur_sportif", "coach"];

export const SYSTEM_CATEGORIES: { value: string; label: string }[] = [
  { value: "attaque_placee", label: "Attaque placée" },
  { value: "transition", label: "Transition / contre-attaque" },
  { value: "defense_individuelle", label: "Défense individuelle" },
  { value: "defense_zone", label: "Défense de zone" },
  { value: "rentree_de_balle", label: "Remise en jeu" },
  { value: "situations_speciales", label: "Situations spéciales" },
  { value: "autre", label: "Autre" },
];

export const categoryLabel = (v: string | null | undefined) =>
  SYSTEM_CATEGORIES.find((c) => c.value === v)?.label ?? "Autre";

export type TokenKind = "attack" | "defense" | "ball";

export function tokenKind(label: string): TokenKind {
  if (label === "B") return "ball";
  if (/^X/i.test(label)) return "defense";
  return "attack";
}

export function clampPos(n: number) {
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}

/** Lit le JSON `positions` de la base en liste sûre. */
export function parsePositions(raw: unknown): TokenPosition[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => p as Partial<TokenPosition>)
    .filter(
      (p) =>
        typeof p.label === "string" &&
        typeof p.x === "number" &&
        typeof p.y === "number",
    )
    .filter((p) => p.label !== "B")
    .map((p) => ({
      label: p.label as string,
      x: clampPos(p.x as number),
      y: clampPos(p.y as number),
      ...(p.ball ? { ball: true } : {}),
      ...(p.screen ? { screen: true } : {}),
    }));
}

export type Pt = { x: number; y: number };

/** Point de contrôle d'une trajectoire courbe (léger décalage perpendiculaire). */
export function curveControl(a: Pt, b: Pt): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return { x: (a.x + b.x) / 2 - dy * 0.16, y: (a.y + b.y) / 2 + dx * 0.16 };
}

function ease(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function along(a: Pt, b: Pt, t: number, curve: boolean): Pt {
  if (!curve) return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  const c = curveControl(a, b);
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

/** Position intermédiaire entre deux séquences (t de 0 à 1), appariée par étiquette. */
export function interpolate(
  from: TokenPosition[],
  to: TokenPosition[],
  t: number,
  curve = true,
): TokenPosition[] {
  const e = curve ? ease(t) : t;
  const fromMap = new Map(from.map((p) => [p.label, p]));
  return to.map((p) => {
    const a = fromMap.get(p.label) ?? p;
    const pt = along(a, p, e, curve);
    const src = e < 0.5 ? a : p;
    return {
      label: p.label,
      ...pt,
      ...(src.screen ? { screen: true } : {}),
    };
  });
}

export const BALL_OFFSET: Pt = { x: 3.6, y: 3.4 };

export function holder(positions: TokenPosition[]) {
  return positions.find((p) => p.ball) ?? null;
}

/** Ballon tenu dans une séquence fixe. */
export function holderBall(positions: TokenPosition[]): Pt | null {
  const h = holder(positions);
  return h ? { x: h.x + BALL_OFFSET.x, y: h.y + BALL_OFFSET.y } : null;
}

/** Ballon pendant la transition : il quitte l'ancien porteur et rejoint le nouveau (passe). */
export function ballBetween(
  from: TokenPosition[],
  to: TokenPosition[],
  t: number,
  curve = true,
): Pt | null {
  const hA = holder(from);
  const hB = holder(to);
  if (!hA && !hB) return null;
  const cur = interpolate(from, to, t, curve);
  const at = (l: string | undefined) => cur.find((p) => p.label === l);
  const a = at(hA?.label) ?? at(hB?.label);
  const b = at(hB?.label) ?? a;
  if (!a || !b) return null;
  const k = Math.min(1, Math.max(0, (t - 0.2) / 0.6));
  const f = k * k * (3 - 2 * k);
  return {
    x: a.x + (b.x - a.x) * f + BALL_OFFSET.x,
    y: a.y + (b.y - a.y) * f + BALL_OFFSET.y,
  };
}

/** Prochain numéro libre pour un joueur d'attaque (1–5…) ou de défense (X1–X5…). */
export function nextLabel(existing: TokenPosition[], kind: "attack" | "defense") {
  const used = new Set(existing.map((p) => p.label));
  for (let i = 1; i <= 9; i++) {
    const l = kind === "attack" ? String(i) : `X${i}`;
    if (!used.has(l)) return l;
  }
  return null;
}
