/** Couleur unique d'une catégorie (définie dans Administration › Catégories). */
export const DEFAULT_CATEGORY_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6", "#ec4899", "#eab308"];

export const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);

/** Couleur d'une catégorie d'après sa couleur enregistrée ; repli sur la couleur du club. */
export const teamColor = (t: { color?: string | null } | null | undefined): string => (t && isHex(t.color) ? t.color : "var(--brand)");
