/** Référentiel de compétences : types de compétence (enum `skill_category`) et libellés. */

export const SKILL_CATEGORIES = ["tir", "dribble", "finition", "passe", "defense", "rebond", "tactique", "physique", "mental"] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  tir: "Tir",
  dribble: "Dribble",
  finition: "Finition",
  passe: "Passe",
  defense: "Défense",
  rebond: "Rebond",
  tactique: "Tactique",
  physique: "Physique",
  mental: "Mental",
};

/** Rubrique d'évaluation (technique, tactique, physique, mental) à laquelle appartient chaque type. */
export const SKILL_CATEGORY_RUBRIC: Record<SkillCategory, "technique" | "tactique" | "physique" | "mental"> = {
  tir: "technique", dribble: "technique", finition: "technique", passe: "technique", defense: "technique", rebond: "technique",
  tactique: "tactique", physique: "physique", mental: "mental",
};

export const isSkillCategory = (v: unknown): v is SkillCategory => typeof v === "string" && (SKILL_CATEGORIES as readonly string[]).includes(v);
