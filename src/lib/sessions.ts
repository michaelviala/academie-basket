/** Constantes et calculs partagés des séances (fonctions pures). */

export const BLOCK_TYPES = [
  {
    value: "echauffement",
    label: "Échauffement",
    color: "#8b8f99",
    minutes: 15,
  },
  { value: "technique", label: "Technique", color: "#5aa9ff", minutes: 15 },
  { value: "tactique", label: "Tactique", color: "#3fb950", minutes: 15 },
  { value: "opposition", label: "Opposition", color: "#e8b84f", minutes: 15 },
  { value: "physique", label: "Physique", color: "#ff7a3d", minutes: 10 },
  {
    value: "retour_au_calme",
    label: "Retour au calme",
    color: "#a78bfa",
    minutes: 5,
  },
] as const;

export const BLOCK_LABEL: Record<string, string> = Object.fromEntries(
  BLOCK_TYPES.map((b) => [b.value, b.label]),
);
export const BLOCK_COLOR: Record<string, string> = Object.fromEntries(
  BLOCK_TYPES.map((b) => [b.value, b.color]),
);
export const blockColor = (type: string) => BLOCK_COLOR[type] ?? "#8b8f99";

export const INTENSITIES = [
  { value: "faible", label: "Faible" },
  { value: "moyenne", label: "Moyenne" },
  { value: "elevee", label: "Élevée" },
] as const;

export const SESSION_EDIT_ROLES = ["admin", "directeur_sportif", "coach"];

export type BlockDraft = {
  key: string;
  name: string;
  block_type: string;
  duration_minutes: number | null;
  comment: string;
  skill_id: string;
  system_id: string;
};

/** « 18:00 » + 15 min → « 18:15 » (null sans heure de début). */
export function clockAt(
  startTime: string | null | undefined,
  offsetMinutes: number,
): string | null {
  if (!startTime) return null;
  const [h, m] = startTime.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const total = h * 60 + m + offsetMinutes;
  return `${String(Math.floor((total % 1440) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function totalMinutes(
  blocks: { duration_minutes: number | null }[],
): number {
  return blocks.reduce((s, b) => s + (b.duration_minutes ?? 0), 0);
}

export function formatDateLong(dateStr: string): string {
  return new Date(`${dateStr.slice(0, 10)}T00:00:00`).toLocaleDateString(
    "fr-FR",
    { weekday: "long", day: "numeric", month: "long" },
  );
}
