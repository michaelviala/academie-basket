/** Périodicité des séances (fonctions pures, style Google Agenda). Dates au format AAAA-MM-JJ. */

export type RecurrenceFreq = "none" | "daily" | "weekly" | "monthly_nth" | "yearly" | "weekdays" | "custom";
export type CustomUnit = "day" | "week" | "month";

export type Recurrence = {
  freq: RecurrenceFreq;
  /** Date de fin incluse (obligatoire dès que freq ≠ none). */
  until: string;
  /** Personnalisé : tous les N jours / semaines / mois. */
  interval: number;
  unit: CustomUnit;
  /** Personnalisé par semaine : jours cochés (0 = lundi … 6 = dimanche). */
  weekdays: number[];
};

export const MAX_OCCURRENCES = 120;

export const WEEKDAY_LABELS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
export const WEEKDAY_SHORT = ["L", "M", "M", "J", "V", "S", "D"];
const ORDINALS = ["premier", "deuxième", "troisième", "quatrième", "cinquième"];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export const parseDay = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
export const fmtDay = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
/** 0 = lundi … 6 = dimanche */
export const weekdayOf = (d: Date) => (d.getUTCDay() + 6) % 7;
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
/** Rang du jour dans son mois (1 = premier lundi, 2 = deuxième lundi…). */
export const nthOfMonth = (d: Date) => Math.floor((d.getUTCDate() - 1) / 7) + 1;

export function defaultRecurrence(until = ""): Recurrence {
  return { freq: "none", until, interval: 1, unit: "week", weekdays: [] };
}

/** Libellés du menu, calculés à partir de la date de la séance (comme Google Agenda). */
export function recurrenceOptions(date: string): { value: RecurrenceFreq; label: string }[] {
  const d = parseDay(date);
  const wd = WEEKDAY_LABELS[weekdayOf(d)];
  return [
    { value: "none", label: "Une seule fois" },
    { value: "daily", label: "Tous les jours" },
    { value: "weekly", label: `Toutes les semaines le ${wd}` },
    { value: "monthly_nth", label: `Tous les mois le ${ORDINALS[nthOfMonth(d) - 1]} ${wd}` },
    { value: "yearly", label: `Tous les ans le ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}` },
    { value: "weekdays", label: "Tous les jours de la semaine (du lundi au vendredi)" },
    { value: "custom", label: "Personnaliser…" },
  ];
}

/** Résumé lisible d'une périodicité (pour la confirmation). */
export function describeRecurrence(date: string, r: Recurrence): string {
  if (r.freq === "none") return "Une seule fois";
  if (r.freq !== "custom") return recurrenceOptions(date).find((o) => o.value === r.freq)?.label ?? "";
  const n = Math.max(1, r.interval);
  if (r.unit === "day") return n === 1 ? "Tous les jours" : `Tous les ${n} jours`;
  if (r.unit === "month") return n === 1 ? `Tous les mois le ${parseDay(date).getUTCDate()}` : `Tous les ${n} mois le ${parseDay(date).getUTCDate()}`;
  const days = (r.weekdays.length ? r.weekdays : [weekdayOf(parseDay(date))]).sort().map((i) => WEEKDAY_LABELS[i]).join(", ");
  return n === 1 ? `Toutes les semaines le ${days}` : `Toutes les ${n} semaines le ${days}`;
}

export function validateRecurrence(date: string, r: Recurrence): string | null {
  if (r.freq === "none") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.until)) return "Indique la date de fin de la répétition.";
  if (r.until < date) return "La date de fin doit être après la date de la séance.";
  if (r.freq === "custom" && (!Number.isInteger(r.interval) || r.interval < 1 || r.interval > 52)) return "L'intervalle de répétition est invalide.";
  return null;
}

/** Toutes les dates de la série, première date incluse, jusqu'à `until` (bornée à MAX_OCCURRENCES). */
export function expandDates(date: string, r: Recurrence, max = MAX_OCCURRENCES): string[] {
  if (r.freq === "none") return [date];
  const start = parseDay(date);
  const until = parseDay(r.until);
  const out: string[] = [];
  const push = (d: Date) => { if (d >= start && d <= until && out.length < max) out.push(fmtDay(d)); };

  if (r.freq === "daily" || (r.freq === "custom" && r.unit === "day")) {
    const step = r.freq === "custom" ? Math.max(1, r.interval) : 1;
    for (let d = start; d <= until && out.length < max; d = addDays(d, step)) push(d);
  } else if (r.freq === "weekdays") {
    for (let d = start; d <= until && out.length < max; d = addDays(d, 1)) if (weekdayOf(d) < 5) push(d);
  } else if (r.freq === "weekly" || (r.freq === "custom" && r.unit === "week")) {
    const step = r.freq === "custom" ? Math.max(1, r.interval) : 1;
    const days = new Set(r.freq === "custom" && r.weekdays.length ? r.weekdays : [weekdayOf(start)]);
    // semaine de référence = lundi de la semaine de départ
    const monday = addDays(start, -weekdayOf(start));
    for (let w = monday; w <= until && out.length < max; w = addDays(w, 7 * step)) {
      for (let i = 0; i < 7; i++) if (days.has(i)) push(addDays(w, i));
    }
  } else if (r.freq === "monthly_nth" || (r.freq === "custom" && r.unit === "month")) {
    const step = r.freq === "custom" ? Math.max(1, r.interval) : 1;
    const y0 = start.getUTCFullYear(), m0 = start.getUTCMonth();
    for (let k = 0; out.length < max; k += step) {
      const first = new Date(Date.UTC(y0, m0 + k, 1));
      if (first > until) break;
      let d: Date | null;
      if (r.freq === "monthly_nth") {
        // même rang + même jour de semaine (ex. troisième lundi) ; mois sauté s'il n'existe pas
        const wd = weekdayOf(start), nth = nthOfMonth(start);
        const offset = (wd - weekdayOf(first) + 7) % 7;
        d = addDays(first, offset + 7 * (nth - 1));
        if (d.getUTCMonth() !== first.getUTCMonth()) d = null;
      } else {
        const dim = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
        d = start.getUTCDate() <= dim ? new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), start.getUTCDate())) : null;
      }
      if (d) push(d);
    }
  } else if (r.freq === "yearly") {
    for (let y = start.getUTCFullYear(); out.length < max; y++) {
      const d = new Date(Date.UTC(y, start.getUTCMonth(), start.getUTCDate()));
      if (d > until) break;
      if (d.getUTCMonth() === start.getUTCMonth()) push(d); // 29 février absent → année sautée
    }
  }
  return out;
}
