/** Évaluation d'un joueur sur les contenus du carnet technique (fonctions pures). */

import type { GuideCategory } from "@/lib/technical-guide";

export type AssessmentStatus = "acquis" | "en_cours" | "a_revoir";
export type GuideSection = "attack" | "defense";

export const STATUS_META: Record<AssessmentStatus, { label: string; short: string; color: string; icon: string }> = {
  acquis: { label: "Acquis", short: "Acquis", color: "#22c55e", icon: "✔" },
  en_cours: { label: "En cours d'acquisition", short: "En cours", color: "#f59e0b", icon: "◐" },
  a_revoir: { label: "À revoir", short: "À revoir", color: "#f87171", icon: "↻" },
};
export const STATUS_ORDER: AssessmentStatus[] = ["acquis", "en_cours", "a_revoir"];
export const SECTION_LABELS: Record<GuideSection, string> = { attack: "Attaque", defense: "Défense" };

export type AssessmentRecord = {
  id: string;
  section: string;
  item_label: string;
  status: string;
  comment: string | null;
  assessed_at: string;
  assessor_id: string | null;
};

export type GridRow = {
  section: GuideSection;
  label: string;
  text: string;
  /** Dernière évaluation connue (la plus récente par date, puis par création). */
  last: AssessmentRecord | null;
  /** Nombre d'évaluations historisées sur ce contenu. */
  count: number;
};

const key = (section: string, label: string) => `${section}::${label.trim().toLowerCase()}`;

/** Libellé d'un contenu du carnet : son label, sinon le début de son texte (certains contenus n'ont qu'un texte). */
export function itemLabel(it: { label: string; text: string }): string {
  const l = it.label.trim();
  if (l) return l;
  const t = it.text.trim().replace(/\s+/g, " ");
  if (!t) return "";
  const cut = t.length > 80 ? t.slice(0, 77).replace(/[ ,;:(]+\S*$/, "") + "…" : t;
  return cut;
}

/** Lignes de la grille : les contenus attaque + défense de la catégorie, avec le dernier statut connu. */
export function buildGrid(cat: GuideCategory, records: AssessmentRecord[]): GridRow[] {
  const byKey = new Map<string, AssessmentRecord[]>();
  for (const r of records) {
    const k = key(r.section, r.item_label);
    byKey.set(k, [...(byKey.get(k) ?? []), r]);
  }
  const rows: GridRow[] = [];
  for (const section of ["attack", "defense"] as const) {
    for (const it of cat[section]) {
      const label = itemLabel(it);
      if (!label) continue;
      const hist = (byKey.get(key(section, label)) ?? []).sort((a, b) => (a.assessed_at < b.assessed_at ? 1 : a.assessed_at > b.assessed_at ? -1 : 0));
      // si le libellé vient du texte, on n'affiche pas le texte une seconde fois
      rows.push({ section, label, text: it.label.trim() ? it.text : "", last: hist[0] ?? null, count: hist.length });
    }
  }
  return rows;
}

export type GridSummary = { total: number; acquis: number; en_cours: number; a_revoir: number; non_evalue: number; pct: number | null };

export function summarize(rows: GridRow[]): GridSummary {
  const s: GridSummary = { total: rows.length, acquis: 0, en_cours: 0, a_revoir: 0, non_evalue: 0, pct: null };
  for (const r of rows) {
    const st = r.last?.status as AssessmentStatus | undefined;
    if (st === "acquis") s.acquis++;
    else if (st === "en_cours") s.en_cours++;
    else if (st === "a_revoir") s.a_revoir++;
    else s.non_evalue++;
  }
  s.pct = s.total > 0 ? Math.round((s.acquis / s.total) * 100) : null;
  return s;
}

export const isStatus = (v: unknown): v is AssessmentStatus => v === "acquis" || v === "en_cours" || v === "a_revoir";
