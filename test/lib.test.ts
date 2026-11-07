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
