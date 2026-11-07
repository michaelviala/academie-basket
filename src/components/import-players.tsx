"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buildPlayers, FIELDS, guessMapping, parseCsv, TEMPLATE_CSV, type FieldKey, type Mapping } from "@/lib/import-players";
import { importPlayers, type ImportResult } from "@/app/(app)/administration/import";

type Sheet = { headers: string[]; rows: unknown[][] };

async function readFile(file: File): Promise<Sheet> {
  let all: unknown[][];
  if (/\.csv$|\.txt$/i.test(file.name)) {
    all = parseCsv(await file.text());
  } else {
    const { readSheet } = await import("read-excel-file/browser");
    all = (await readSheet(file)) as unknown[][];
  }
  all = all.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
  if (all.length < 2) throw new Error("Le fichier ne contient pas de données (il faut une ligne d'en-têtes puis les joueurs).");
  return { headers: all[0].map((h) => String(h ?? "").trim()), rows: all.slice(1) };
}

export function ImportPlayers({ onClose }: { onClose: () => void }) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [createTeams, setCreateTeams] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  async function onFile(f: File | undefined) {
    if (!f) return;
    setError(null); setResult(null);
    try {
      const s = await readFile(f);
      setSheet(s); setFileName(f.name); setMapping(guessMapping(s.headers));
    } catch (e) {
      setSheet(null);
      setError(e instanceof Error ? e.message : "Fichier illisible. Utilise un .xlsx ou un .csv.");
    }
  }

  const built = useMemo(() => (sheet ? buildPlayers(sheet.rows, mapping, sheet.headers) : null), [sheet, mapping]);
  const missingRequired = FIELDS.filter((f) => f.required && mapping[f.key] === undefined);
  const withParents = built?.players.filter((p) => p.guardians.length > 0).length ?? 0;
  const teamNames = [...new Set((built?.players ?? []).map((p) => p.team).filter(Boolean))];

  function run() {
    if (!built) return;
    setError(null);
    start(async () => {
      const r = await importPlayers(built.players, createTeams);
      setResult(r);
      if (!r.error) router.refresh();
    });
  }

  function setField(k: FieldKey, v: string) {
    setMapping((m) => {
      const n = { ...m };
      if (v === "") delete n[k]; else n[k] = Number(v);
      return n;
    });
  }

  const template = "data:text/csv;charset=utf-8,%EF%BB%BF" + encodeURIComponent(TEMPLATE_CSV);

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Importer des joueurs et leurs parents</h2>
          <p className="text-xs text-faint">
            Fichier Excel (.xlsx) ou CSV, avec une ligne d&apos;en-têtes. Les joueurs déjà présents (même nom, prénom et date de naissance) ne sont pas dupliqués : on ajoute seulement les parents manquants.
          </p>
        </div>
        <button className="text-xs" onClick={onClose}>Fermer ✕</button>
      </div>

      {!result && (
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" accept=".xlsx,.csv,.txt" className="input" style={{ maxWidth: 360 }} onChange={(e) => onFile(e.target.files?.[0])} />
          <a href={template} download="modele-import-joueurs.csv" className="text-xs underline">Télécharger un modèle</a>
        </div>
      )}
      {error && <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>{error}</p>}

      {sheet && built && !result && (
        <>
          <div>
            <p className="mb-2 text-sm font-medium">1. Vérifie la correspondance des colonnes <span className="text-faint">({fileName} · {sheet.rows.length} lignes)</span></p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map((f) => (
                <label key={f.key} className="text-xs">
                  <span className="label">{f.label}{f.required ? " *" : ""}</span>
                  <select className="input" value={mapping[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)}>
                    <option value="">— ignorer —</option>
                    {sheet.headers.map((h, i) => <option key={i} value={i}>{h || `Colonne ${i + 1}`}</option>)}
                  </select>
                </label>
              ))}
            </div>
            {missingRequired.length > 0 && (
              <p className="mt-2 text-sm" style={{ color: "#fbbf24" }}>À associer : {missingRequired.map((f) => f.label).join(", ")}.</p>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">2. Aperçu</p>
            <p className="mb-2 text-sm">
              <b>{built.players.length}</b> joueur(s) prêts, dont <b>{withParents}</b> avec parent(s)
              {built.issues.length > 0 && <> · <span style={{ color: "#fbbf24" }}>{built.issues.length} ligne(s) ignorée(s)</span></>}.
              {teamNames.length > 0 && <> Catégories dans le fichier : {teamNames.join(", ")}.</>}
            </p>
            <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border)" }}>
              <table className="w-full text-xs">
                <thead style={{ background: "var(--surf-2)" }}>
                  <tr className="text-left"><th className="p-2">Joueur</th><th className="p-2">Naissance</th><th className="p-2">Catégorie</th><th className="p-2">Parents</th></tr>
                </thead>
                <tbody>
                  {built.players.slice(0, 8).map((p, i) => (
                    <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                      <td className="p-2">{p.firstName} {p.lastName}</td>
                      <td className="p-2">{new Date(p.birthDate).toLocaleDateString("fr-FR")}</td>
                      <td className="p-2">{p.team || "—"}</td>
                      <td className="p-2">{p.guardians.map((g) => `${g.fullName}${g.email ? " · " + g.email : ""}${g.phone ? " · " + g.phone : ""}`).join(" / ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {built.players.length > 8 && <p className="mt-1 text-xs text-faint">… et {built.players.length - 8} autres.</p>}
            {built.issues.length > 0 && (
              <details className="mt-2 text-xs" style={{ color: "#fbbf24" }}>
                <summary className="cursor-pointer">Lignes ignorées ({built.issues.length})</summary>
                <ul className="mt-1 list-disc pl-5">{built.issues.slice(0, 50).map((i, k) => <li key={k}>Ligne {i.line} : {i.message}</li>)}</ul>
              </details>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={createTeams} onChange={(e) => setCreateTeams(e.target.checked)} />
            Créer automatiquement les catégories du fichier qui n&apos;existent pas encore (saison active)
          </label>

          <button className="btn-primary" disabled={pending || missingRequired.length > 0 || built.players.length === 0} onClick={run}>
            {pending ? "Import en cours…" : `Importer ${built.players.length} joueur(s)`}
          </button>
        </>
      )}

      {result && (
        <div className="space-y-2 text-sm">
          {result.error ? (
            <p className="rounded-lg px-3 py-2" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>{result.error}</p>
          ) : (
            <p className="rounded-lg px-3 py-2" style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>Import terminé ✔</p>
          )}
          <ul className="list-disc pl-5">
            <li>{result.created} joueur(s) créé(s), {result.existing} déjà présent(s)</li>
            <li>{result.guardiansAdded} parent(s) ajouté(s)</li>
            {result.teamsCreated.length > 0 && <li>Catégories créées : {result.teamsCreated.join(", ")}</li>}
            {result.noTeam.length > 0 && <li style={{ color: "#fbbf24" }}>Catégorie introuvable (joueurs laissés sans catégorie) : {result.noTeam.join(", ")}</li>}
          </ul>
          <button className="btn-secondary" onClick={() => { setResult(null); setSheet(null); }}>Importer un autre fichier</button>
        </div>
      )}
    </div>
  );
}
