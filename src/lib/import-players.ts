/** Import de joueurs + parents depuis un fichier Excel / CSV : détection des colonnes et nettoyage (fonctions pures). */

export const norm = (v: unknown) =>
  String(v ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[-'’_.]/g, " ").replace(/\s+/g, " ").trim();

export type FieldKey =
  | "lastName" | "firstName" | "birthDate" | "team" | "jersey"
  | "p1Name" | "p1Email" | "p1Phone" | "p1Rel"
  | "p2Name" | "p2Email" | "p2Phone" | "p2Rel";

export const FIELDS: { key: FieldKey; label: string; required?: boolean; group: "joueur" | "parent1" | "parent2"; hints: string[] }[] = [
  { key: "lastName", label: "Nom du joueur", required: true, group: "joueur", hints: ["nom joueur", "nom du joueur", "nom licencie", "nom"] },
  { key: "firstName", label: "Prénom du joueur", required: true, group: "joueur", hints: ["prenom joueur", "prenom du joueur", "prenom licencie", "prenom"] },
  { key: "birthDate", label: "Date de naissance", required: true, group: "joueur", hints: ["date de naissance", "naissance", "date naissance", "ne le", "ne(e) le"] },
  { key: "team", label: "Équipe / catégorie", group: "joueur", hints: ["equipe", "categorie", "niveau", "groupe"] },
  { key: "jersey", label: "N° de maillot", group: "joueur", hints: ["maillot", "numero", "n°"] },
  { key: "p1Name", label: "Parent 1 — nom", group: "parent1", hints: ["parent 1 nom", "nom parent 1", "responsable 1", "parent 1", "mere", "nom mere", "nom parent", "parent", "responsable legal", "responsable"] },
  { key: "p1Email", label: "Parent 1 — e-mail", group: "parent1", hints: ["email parent 1", "mail parent 1", "e mail parent 1", "email mere", "mail mere", "email parent", "mail parent", "email responsable", "email", "mail", "e mail"] },
  { key: "p1Phone", label: "Parent 1 — téléphone", group: "parent1", hints: ["tel parent 1", "telephone parent 1", "portable parent 1", "tel mere", "portable mere", "tel parent", "telephone parent", "portable", "telephone", "tel", "mobile"] },
  { key: "p1Rel", label: "Parent 1 — lien (mère, père…)", group: "parent1", hints: ["lien parent 1", "lien 1", "lien", "qualite 1"] },
  { key: "p2Name", label: "Parent 2 — nom", group: "parent2", hints: ["parent 2 nom", "nom parent 2", "responsable 2", "parent 2", "pere", "nom pere"] },
  { key: "p2Email", label: "Parent 2 — e-mail", group: "parent2", hints: ["email parent 2", "mail parent 2", "e mail parent 2", "email pere", "mail pere", "email 2", "mail 2"] },
  { key: "p2Phone", label: "Parent 2 — téléphone", group: "parent2", hints: ["tel parent 2", "telephone parent 2", "portable parent 2", "tel pere", "portable pere", "tel 2", "portable 2"] },
  { key: "p2Rel", label: "Parent 2 — lien", group: "parent2", hints: ["lien parent 2", "lien 2", "qualite 2"] },
];

export type Mapping = Partial<Record<FieldKey, number>>;

/** Propose une correspondance colonnes ↔ champs d'après les en-têtes (le plus précis d'abord). */
export function guessMapping(headers: string[]): Mapping {
  const nh = headers.map(norm);
  const used = new Set<number>();
  const m: Mapping = {};
  // 1) correspondance exacte, 2) l'en-tête contient l'indice : on traite les champs dans l'ordre, indices longs d'abord
  const cands = FIELDS.flatMap((f) => f.hints.map((h) => ({ f: f.key, h }))).sort((a, b) => b.h.length - a.h.length);
  for (const pass of ["exact", "contains"] as const) {
    for (const { f, h } of cands) {
      if (m[f] !== undefined) continue;
      const i = nh.findIndex((x, idx) => !used.has(idx) && x !== "" && (pass === "exact" ? x === h : h.length >= 4 && x.includes(h)));
      if (i >= 0) { m[f] = i; used.add(i); }
    }
  }
  return m;
}

export type Relationship = "mere" | "pere" | "tuteur" | "autre";
export type ParsedGuardian = { fullName: string; relationship: Relationship; email: string; phone: string };
export type ParsedPlayer = {
  lastName: string;
  firstName: string;
  birthDate: string; // AAAA-MM-JJ
  team: string;
  jersey: number | null;
  guardians: ParsedGuardian[];
};
export type RowIssue = { line: number; message: string };

export function parseDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(v.getUTCDate()).padStart(2, "0")}`;
  }
  if (typeof v === "number" && v > 1000 && v < 80000) {
    return parseDate(new Date(Math.round((v - 25569) * 86400000)));
  }
  const s = String(v ?? "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  let d: number, mo: number, y: number;
  if (m) { d = +m[1]; mo = +m[2]; y = +m[3]; if (y < 100) y += y > 30 ? 1900 : 2000; }
  else if ((m = s.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1950 || y > new Date().getFullYear()) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const text = (v: unknown) => String(v instanceof Date ? "" : v ?? "").trim().replace(/\s+/g, " ");

export function cleanPhone(v: unknown): string {
  let s = text(v);
  if (/^\d{9}$/.test(s)) s = "0" + s; // Excel a retiré le 0 initial
  return s.replace(/[^\d +.()\-]/g, "").trim();
}

function guessRel(label: string, fallback: Relationship): Relationship {
  const n = norm(label);
  if (/mere|maman|mother/.test(n)) return "mere";
  if (/pere|papa|father/.test(n)) return "pere";
  if (/tuteur|tutrice|responsable|grand/.test(n)) return "tuteur";
  return n ? "autre" : fallback;
}

/** Transforme les lignes brutes en joueurs (fusionne les lignes d'un même joueur : un parent par ligne). */
export function buildPlayers(rows: unknown[][], mapping: Mapping, headers: string[]): { players: ParsedPlayer[]; issues: RowIssue[] } {
  const get = (r: unknown[], k: FieldKey) => (mapping[k] === undefined ? undefined : r[mapping[k]!]);
  const defRel = (k: "p1Rel" | "p2Rel", nameKey: "p1Name" | "p2Name", fallback: Relationship): Relationship => {
    const h = mapping[nameKey] !== undefined ? headers[mapping[nameKey]!] : "";
    return guessRel(h ?? "", fallback);
  };
  const def1 = defRel("p1Rel", "p1Name", "autre");
  const def2 = defRel("p2Rel", "p2Name", "autre");
  const byKey = new Map<string, ParsedPlayer>();
  const issues: RowIssue[] = [];
  rows.forEach((r, idx) => {
    const line = idx + 2;
    if (r.every((c) => text(c) === "")) return;
    const lastName = text(get(r, "lastName"));
    const firstName = text(get(r, "firstName"));
    if (!lastName || !firstName) { issues.push({ line, message: "Nom ou prénom manquant" }); return; }
    const birthDate = parseDate(get(r, "birthDate"));
    if (!birthDate) { issues.push({ line, message: `${firstName} ${lastName} : date de naissance absente ou illisible` }); return; }
    const jerseyN = parseInt(text(get(r, "jersey")), 10);
    const guardians: ParsedGuardian[] = [];
    for (const [n, def] of [[1, def1], [2, def2]] as const) {
      const name = text(get(r, `p${n}Name` as FieldKey));
      const email = text(get(r, `p${n}Email` as FieldKey)).toLowerCase();
      const phone = cleanPhone(get(r, `p${n}Phone` as FieldKey));
      if (!name && !email && !phone) continue;
      const relLabel = text(get(r, `p${n}Rel` as FieldKey));
      guardians.push({ fullName: name || email || phone, relationship: relLabel ? guessRel(relLabel, def) : def, email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : "", phone });
    }
    const key = `${norm(lastName)}|${norm(firstName)}|${birthDate}`;
    const cur = byKey.get(key);
    if (cur) {
      for (const g of guardians) if (!cur.guardians.some((x) => norm(x.fullName) === norm(g.fullName))) cur.guardians.push(g);
      if (!cur.team) cur.team = text(get(r, "team"));
    } else {
      byKey.set(key, { lastName, firstName, birthDate, team: text(get(r, "team")), jersey: Number.isFinite(jerseyN) && jerseyN >= 0 && jerseyN < 100 ? jerseyN : null, guardians });
    }
  });
  return { players: [...byKey.values()], issues };
}

/** Lecture d'un CSV (séparateur , ou ;, guillemets). Première ligne = en-têtes. */
export function parseCsv(textContent: string): string[][] {
  const t = textContent.replace(/^﻿/, "");
  const first = t.split(/\r?\n/)[0] ?? "";
  const sep = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : (first.match(/\t/g)?.length ?? 0) > 0 ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export const TEMPLATE_CSV =
  "Nom;Prénom;Date de naissance;Équipe;N° maillot;Parent 1 nom;Parent 1 e-mail;Parent 1 téléphone;Parent 2 nom;Parent 2 e-mail;Parent 2 téléphone\n" +
  "DUPONT;Lucas;12/03/2014;U11;7;Sophie Dupont;sophie.dupont@exemple.fr;0612345678;Marc Dupont;;0687654321\n";
