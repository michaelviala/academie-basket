import test from "node:test";
import assert from "node:assert/strict";
import { buildPlayers, guessMapping, parseCsv, parseDate, cleanPhone } from "../src/lib/import-players.ts";
import { attendanceRate } from "../src/lib/player-stats.ts";
import { cleanGuardian } from "../src/lib/guardians.ts";

test("dates : formats français, Excel et ISO", () => {
  assert.equal(parseDate("12/03/2014"), "2014-03-12");
  assert.equal(parseDate("5.7.12"), "2012-07-05");
  assert.equal(parseDate("2014-03-12"), "2014-03-12");
  assert.equal(parseDate(new Date(Date.UTC(2014, 2, 12))), "2014-03-12");
  assert.equal(parseDate("31/02/2014"), null);
  assert.equal(parseDate(""), null);
});

test("téléphone : 0 initial retrouvé", () => {
  assert.equal(cleanPhone(612345678), "0612345678");
  assert.equal(cleanPhone("06 11 22 33 44"), "06 11 22 33 44");
});

test("colonnes détectées d'après les en-têtes", () => {
  const m = guessMapping(["Nom", "Prénom", "Date de naissance", "Catégorie", "Mère", "Email mère", "Tél mère", "Père"]);
  assert.deepEqual([m.lastName, m.firstName, m.birthDate, m.team, m.p1Name, m.p1Email, m.p1Phone, m.p2Name], [0, 1, 2, 3, 4, 5, 6, 7]);
});

test("une ligne par parent est fusionnée sur le même joueur", () => {
  const headers = ["Nom", "Prénom", "Naissance", "Parent", "Email"];
  const rows = [
    ["Dupont", "Lucas", "12/03/2014", "Sophie Dupont", "s@ex.fr"],
    ["Dupont", "Lucas", "12/03/2014", "Marc Dupont", "m@ex.fr"],
    ["Roux", "Noah", "", "X", ""],
  ];
  const { players, issues } = buildPlayers(rows, guessMapping(headers), headers);
  assert.equal(players.length, 1);
  assert.equal(players[0].guardians.length, 2);
  assert.equal(issues.length, 1);
});

test("CSV : séparateur ; et guillemets", () => {
  const r = parseCsv('Nom;Prénom\n"Du;pont";"Luc ""L"""\n');
  assert.deepEqual(r, [["Nom", "Prénom"], ["Du;pont", 'Luc "L"']]);
});

test("taux de présence : retard compte comme présent", () => {
  assert.equal(attendanceRate(["present", "retard", "absent", "absent_justifie"]), 50);
  assert.equal(attendanceRate([]), null);
});

test("parent : e-mail invalide refusé", () => {
  const base = { playerId: "p", fullName: "A B", relationship: "mere" as const, email: "pas-un-mail", phone: "", isPrimary: false, notes: "" };
  assert.ok("error" in cleanGuardian(base));
  assert.ok("ok" in cleanGuardian({ ...base, email: "a@b.fr" }));
});

test("import : champs de la fiche joueur (taille, poids, main, postes, entrée, ancien club)", () => {
  const headers = ["Nom", "Prénom", "Date de naissance", "Taille (cm)", "Poids (kg)", "Envergure", "Main dominante", "Poste principal", "Poste secondaire", "Date d'entrée", "Ancien club"];
  const m = guessMapping(headers);
  assert.deepEqual([m.height, m.weight, m.wingspan, m.hand, m.pos1, m.pos2, m.entryDate, m.prevClub], [3, 4, 5, 6, 7, 8, 9, 10]);
  const { players } = buildPlayers([["DUPONT", "Lucas", "12/03/2014", "142", "36,5", "", "Gaucher", "Meneur", "Arrière", "01/09/2025", "BC Exemple"]], m, headers);
  assert.equal(players.length, 1);
  const p = players[0];
  assert.deepEqual([p.height, p.weight, p.wingspan, p.hand, p.pos1, p.pos2, p.entryDate, p.prevClub], [142, 36.5, null, "gauche", "Meneur", "Arrière", "2025-09-01", "BC Exemple"]);
});

test("périodicité : libellés et dates générées", async () => {
  const { expandDates, recurrenceOptions, defaultRecurrence } = await import("../src/lib/recurrence.ts");
  const labels = recurrenceOptions("2026-11-16").map((o) => o.label);
  assert.equal(labels[2], "Toutes les semaines le lundi");
  assert.equal(labels[3], "Tous les mois le troisième lundi");
  assert.equal(labels[4], "Tous les ans le 16 novembre");
  const base = defaultRecurrence("2026-12-31");
  assert.deepEqual(expandDates("2026-11-16", { ...base, freq: "none" }), ["2026-11-16"]);
  assert.deepEqual(expandDates("2026-11-16", { ...base, freq: "weekly" }), ["2026-11-16", "2026-11-23", "2026-11-30", "2026-12-07", "2026-12-14", "2026-12-21", "2026-12-28"]);
  assert.deepEqual(expandDates("2026-11-16", { ...base, freq: "monthly_nth" }), ["2026-11-16", "2026-12-21"]);
  assert.equal(expandDates("2026-11-16", { ...base, freq: "weekdays", until: "2026-11-22" }).length, 5);
  assert.deepEqual(expandDates("2026-11-16", { ...base, freq: "custom", unit: "week", interval: 2, weekdays: [0, 2], until: "2026-12-06" }), ["2026-11-16", "2026-11-18", "2026-11-30", "2026-12-02"]);
  assert.deepEqual(expandDates("2026-11-16", { ...base, freq: "yearly", until: "2028-01-01" }), ["2026-11-16", "2027-11-16"]);
  assert.equal(expandDates("2026-11-16", { ...base, freq: "daily", until: "2030-01-01" }).length, 120);
});
