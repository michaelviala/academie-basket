/** Utilitaires partagés de la bibliothèque de systèmes (fonctions pures). */

export type TokenPosition = { label: string; x: number; y: number };

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
    .map((p) => ({
      label: p.label as string,
      x: clampPos(p.x as number),
      y: clampPos(p.y as number),
    }));
}

/** Position intermédiaire entre deux séquences (t de 0 à 1), appariée par étiquette. */
export function interpolate(
  from: TokenPosition[],
  to: TokenPosition[],
  t: number,
): TokenPosition[] {
  const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const fromMap = new Map(from.map((p) => [p.label, p]));
  return to.map((p) => {
    const a = fromMap.get(p.label) ?? p;
    return {
      label: p.label,
      x: a.x + (p.x - a.x) * e,
      y: a.y + (p.y - a.y) * e,
    };
  });
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
