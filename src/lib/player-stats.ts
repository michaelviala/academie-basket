/**
 * Calculs partagés par la liste des joueurs et la fiche joueur (fonctions pures, sans accès serveur).
 */

export const EVAL_TYPES = ["technique", "tactique", "physique", "mental"] as const;
export type EvalType = (typeof EVAL_TYPES)[number];

export const EVAL_LABELS: Record<EvalType, string> = {
  technique: "Technique",
  tactique: "Tactique",
  physique: "Physique",
  mental: "Mental",
};

export const EVAL_SHORT: Record<EvalType, string> = {
  technique: "TEC",
  tactique: "TAC",
  physique: "PHY",
  mental: "MEN",
};

// Mêmes couleurs que le graphique de progression (validées sur fond sombre).
export const EVAL_COLORS: Record<EvalType, string> = {
  technique: "#3987e5",
  tactique: "#d95926",
  physique: "#199e70",
  mental: "#c98500",
};

export type EvalRow = { evaluation_type: string; score: number | string; evaluated_at: string };

export const tint = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

/** Couleur d'une catégorie (U11, U13...) d'après le cahier technique ; repli sur la couleur du club. */
export function categoryColor(map: Record<string, string>, category: string | null | undefined): string {
  return (category && map[category]) || "var(--brand)";
}

export function average(rows: EvalRow[]): number | null {
  if (rows.length === 0) return null;
  return rows.reduce((s, r) => s + Number(r.score), 0) / rows.length;
}

export function typeAverages(rows: EvalRow[]): Record<EvalType, number | null> {
  return {
    technique: average(rows.filter((r) => r.evaluation_type === "technique")),
    tactique: average(rows.filter((r) => r.evaluation_type === "tactique")),
    physique: average(rows.filter((r) => r.evaluation_type === "physique")),
    mental: average(rows.filter((r) => r.evaluation_type === "mental")),
  };
}

/** Moyenne globale = moyenne des moyennes par rubrique (technique, tactique, physique, mental). */
export function globalAverage(rows: EvalRow[]): number | null {
  const vals = Object.values(typeAverages(rows)).filter((v): v is number => v !== null);
  return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
}

const DAY = 86_400_000;

export function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(`${dateStr.slice(0, 10)}T00:00:00`).getTime()) / DAY);
}

/** Évolution d'une rubrique : moyenne des 90 derniers jours moins celle des 90 jours précédents (null si pas comparable). */
export function trend(rows: EvalRow[], type?: EvalType): number | null {
  const scoped = type ? rows.filter((r) => r.evaluation_type === type) : rows;
  const recent = scoped.filter((r) => (daysSince(r.evaluated_at) ?? 9999) <= 90);
  const previous = scoped.filter((r) => {
    const d = daysSince(r.evaluated_at) ?? 9999;
    return d > 90 && d <= 180;
  });
  const a = average(recent);
  const b = average(previous);
  return a !== null && b !== null ? a - b : null;
}

/** Vert à partir de 7, orange à partir de 5, rouge en dessous. */
export function scoreColor(v: number | null): string {
  if (v === null) return "var(--text-faint)";
  if (v >= 7) return "var(--green)";
  if (v >= 5) return "var(--amber)";
  return "var(--red)";
}

/** Taux de présence : part des séances où le joueur est « présent » (même définition que le tableau de bord). */
export function attendanceRate(statuses: string[]): number | null {
  if (statuses.length === 0) return null;
  return Math.round((statuses.filter((s) => s === "present").length / statuses.length) * 100);
}

export function agoLabel(days: number | null): string {
  if (days === null) return "Jamais évalué";
  if (days <= 0) return "Évalué aujourd'hui";
  if (days === 1) return "Évalué hier";
  if (days < 60) return `Évalué il y a ${days} j`;
  return `Évalué il y a ${Math.round(days / 30)} mois`;
}

export function formatDateFr(dateStr: string): string {
  return new Date(`${dateStr.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
