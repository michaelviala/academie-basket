/** Planification de la saison : blocks (périodes), travaux et rattachement des séances. */

export const BLOCK_EDIT_ROLES = ["admin", "directeur_sportif"];

export const FOCUSES: { value: string; label: string; color: string }[] = [
  { value: "tir", label: "Tir", color: "#5aa9ff" },
  { value: "finition", label: "Finition", color: "#ff7a3d" },
  { value: "defense", label: "Défense", color: "#3fb950" },
  { value: "situationnel", label: "Situationnel", color: "#e8b84f" },
  { value: "aisance", label: "Aisance", color: "#a78bfa" },
];

export const focusLabel = (v: string | null | undefined) =>
  FOCUSES.find((f) => f.value === v)?.label ?? null;
export const focusColor = (v: string | null | undefined) =>
  FOCUSES.find((f) => f.value === v)?.color ?? "var(--text-faint)";

export type SeasonBlock = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  planned_sessions: number;
  major_axis: string | null;
  position: number;
};

/** Block qui contient une date (AAAA-MM-JJ), sinon null. */
export function blockForDate(blocks: SeasonBlock[], date: string) {
  return blocks.find((b) => date >= b.start_date && date <= b.end_date) ?? null;
}

export function formatRange(start: string, end: string) {
  const f = (d: string, withYear: boolean) =>
    new Date(`${d}T00:00:00`).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
    });
  return `${f(start, false)} → ${f(end, true)}`;
}
