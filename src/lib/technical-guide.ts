/**
 * Cahier technique du club : types, constantes et nettoyage des données.
 * Fichier "pur" (aucun import serveur) : utilisable côté client comme côté serveur.
 * Le contenu est stocké en JSON dans la table `technical_guide` (une seule ligne).
 */

export type GuideItem = { label: string; text: string };

export type GuideCategory = {
  code: string; // ex. "U11"
  color: string; // #rrggbb
  title: string; // ex. "École de basket"
  subtitle: string; // ex. "Mini-poussins / Poussins"
  badge: string; // ex. "Apprentissage"
  tactical: string; // priorité tactique
  physical: string; // focus physique
  philosophy: string; // philosophie d'apprentissage
  attack: GuideItem[];
  defense: GuideItem[];
};

export type PeriodRow = {
  categories: string; // ex. "U11 / U13"
  volume: string;
  physical: string;
  tactical: string;
};

export type GuidePeriod = {
  name: string;
  dates: string;
  duration: string;
  start_month: number; // 1-12
  end_month: number; // 1-12
  color: string;
  objective: string;
  rows: PeriodRow[];
};

export type SessionBlock = {
  start: number; // minutes
  end: number;
  title: string;
  text: string;
  color: string;
};

export type TechnicalGuide = {
  header: { title: string; subtitle: string; tags: string[] };
  categories: GuideCategory[];
  cycle: { title: string; intro: string; periods: GuidePeriod[] };
  sessions: { title: string; blocks: SessionBlock[] };
  truces: { title: string; subtitle: string; items: GuideItem[] };
};

/** Rôles autorisés à modifier le cahier technique. */
export const GUIDE_EDIT_ROLES = ["admin", "directeur_sportif", "coach"] as const;

/** Mois de la saison, dans l'ordre d'affichage (août → juin). */
export const SEASON_MONTHS = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6] as const;
export const MONTH_SHORT: Record<number, string> = {
  1: "Jan", 2: "Fév", 3: "Mar", 4: "Avr", 5: "Mai", 6: "Juin",
  7: "Juil", 8: "Août", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Déc",
};
export const MONTH_LONG: Record<number, string> = {
  1: "Janvier", 2: "Février", 3: "Mars", 4: "Avril", 5: "Mai", 6: "Juin",
  7: "Juillet", 8: "Août", 9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Décembre",
};

export const DEFAULT_COLOR = "#ff6a1f";

/** Vrai si la ligne de volume hebdomadaire concerne la catégorie (ex. "U11 / U13" concerne U11 et U13). */
export function rowMatchesCategory(row: PeriodRow, code: string): boolean {
  return row.categories
    .split(/[\/,&+]|\bet\b/i)
    .map((s) => s.trim().toUpperCase())
    .includes(code.trim().toUpperCase());
}

// ---------------------------------------------------------------------------
// Nettoyage : tout ce qui vient du navigateur (ou de la base) passe par ici.
// ---------------------------------------------------------------------------

const str = (v: unknown, max = 800): string => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const color = (v: unknown, fallback = DEFAULT_COLOR): string =>
  typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
const list = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const items = (v: unknown): GuideItem[] =>
  list(v, 30).map((i) => ({ label: str(obj(i).label, 80), text: str(obj(i).text, 600) }));

export function sanitizeGuide(input: unknown): TechnicalGuide {
  const g = obj(input);
  const header = obj(g.header);
  const cycle = obj(g.cycle);
  const sessions = obj(g.sessions);
  const truces = obj(g.truces);

  return {
    header: {
      title: str(header.title, 120) || "Cahier technique",
      subtitle: str(header.subtitle, 300),
      tags: list(header.tags, 8).map((t) => str(t, 60)).filter(Boolean),
    },
    categories: list(g.categories, 12).map((c) => {
      const o = obj(c);
      return {
        code: str(o.code, 12) || "—",
        color: color(o.color),
        title: str(o.title, 120),
        subtitle: str(o.subtitle, 160),
        badge: str(o.badge, 60),
        tactical: str(o.tactical, 300),
        physical: str(o.physical, 300),
        philosophy: str(o.philosophy, 300),
        attack: items(o.attack),
        defense: items(o.defense),
      };
    }),
    cycle: {
      title: str(cycle.title, 160),
      intro: str(cycle.intro, 600),
      periods: list(cycle.periods, 12).map((p) => {
        const o = obj(p);
        return {
          name: str(o.name, 160),
          dates: str(o.dates, 80),
          duration: str(o.duration, 60),
          start_month: num(o.start_month, 1, 12, 9),
          end_month: num(o.end_month, 1, 12, 9),
          color: color(o.color),
          objective: str(o.objective, 600),
          rows: list(o.rows, 12).map((r) => {
            const x = obj(r);
            return {
              categories: str(x.categories, 60),
              volume: str(x.volume, 80),
              physical: str(x.physical, 200),
              tactical: str(x.tactical, 200),
            };
          }),
        };
      }),
    },
    sessions: {
      title: str(sessions.title, 160),
      blocks: list(sessions.blocks, 20).map((b) => {
        const o = obj(b);
        const start = num(o.start, 0, 600, 0);
        return {
          start,
          end: Math.max(start, num(o.end, 0, 600, start)),
          title: str(o.title, 120),
          text: str(o.text, 400),
          color: color(o.color),
        };
      }),
    },
    truces: {
      title: str(truces.title, 160),
      subtitle: str(truces.subtitle, 200),
      items: items(truces.items),
    },
  };
}
