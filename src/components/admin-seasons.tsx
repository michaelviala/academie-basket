"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { activateSeason, archiveSeason, deleteSeason, saveSeason } from "@/app/(app)/administration/seasons";

export type AdminSeason = { id: string; label: string; start_date: string; end_date: string; is_active: boolean; archived: boolean; teams: number; players: number };

const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

function SeasonForm({ season, onDone, onError }: { season?: AdminSeason; onDone: () => void; onError: (m: string) => void }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const y = new Date().getFullYear();
  return (
    <form
      action={(fd) =>
        start(async () => {
          const r = await saveSeason(season?.id ?? null, fd);
          if (r.error) onError(r.error);
          else { router.refresh(); onDone(); }
        })
      }
      className="grid gap-2 rounded-lg p-3 sm:grid-cols-3"
      style={{ background: "var(--surf-2)" }}
    >
      <div><label className="label">Nom *</label><input className="input" name="label" defaultValue={season?.label} placeholder={`${y}-${y + 1}`} required /></div>
      <div><label className="label">Début *</label><input className="input" type="date" name="start_date" defaultValue={season?.start_date ?? `${y}-08-01`} required /></div>
      <div><label className="label">Fin *</label><input className="input" type="date" name="end_date" defaultValue={season?.end_date ?? `${y + 1}-06-30`} required /></div>
      <div className="flex gap-2 sm:col-span-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Enregistrement…" : season ? "Enregistrer" : "Créer la saison"}</button>
        <button type="button" className="btn-secondary" onClick={onDone}>Annuler</button>
      </div>
    </form>
  );
}

/** Administration › Saisons : création, modification, activation, archivage, suppression. */
export function AdminSeasons({ seasons }: { seasons: AdminSeason[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r.error) setError(r.error);
      else router.refresh();
    });

  const visible = seasons.filter((s) => showArchived || !s.archived);
  const archivedCount = seasons.filter((s) => s.archived).length;

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Saisons</h2>
        <div className="flex items-center gap-2">
          {archivedCount > 0 && (
            <button type="button" className="text-xs underline" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? "Masquer les archivées" : `Voir les archivées (${archivedCount})`}
            </button>
          )}
          {!creating && <button type="button" className="btn-primary" style={{ padding: "6px 12px" }} onClick={() => { setCreating(true); setEditing(null); }}>+ Nouvelle saison</button>}
        </div>
      </div>
      <p className="text-xs" style={{ color: "var(--text-faint)" }}>
        Une seule saison est active : c&apos;est elle qui est proposée pour les catégories, les joueurs et les séances périodiques. Archive les saisons terminées pour les sortir des formulaires sans perdre l&apos;historique.
      </p>
      {error && <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>{error}</p>}
      {creating && <SeasonForm onDone={() => setCreating(false)} onError={setError} />}
      <ul className="space-y-2">
        {visible.map((s) => (
          <li key={s.id} className="rounded-lg px-3 py-2" style={{ background: "var(--surf-2)", opacity: s.archived ? 0.6 : 1 }}>
            {editing === s.id ? (
              <SeasonForm season={s} onDone={() => setEditing(null)} onError={setError} />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">
                  <span className="font-semibold">{s.label}</span>
                  <span style={{ color: "var(--text-faint)" }}> · {fmt(s.start_date)} → {fmt(s.end_date)}</span>
                  <span className="ml-2 text-xs" style={{ color: "var(--text-faint)" }}>{s.teams} catégorie{s.teams > 1 ? "s" : ""} · {s.players} joueur{s.players > 1 ? "s" : ""}</span>
                  {s.is_active && <span className="badge ml-2" style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80", borderColor: "transparent" }}>Active</span>}
                  {s.archived && <span className="badge ml-2">Archivée</span>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {!s.is_active && <button type="button" className="btn-secondary" style={{ padding: "4px 10px", fontSize: 12 }} disabled={pending} onClick={() => run(() => activateSeason(s.id))}>Rendre active</button>}
                  <button type="button" className="btn-secondary" style={{ padding: "4px 10px", fontSize: 12 }} disabled={pending} onClick={() => { setEditing(s.id); setCreating(false); }}>Modifier</button>
                  {!s.is_active && (
                    <button type="button" className="btn-secondary" style={{ padding: "4px 10px", fontSize: 12 }} disabled={pending} onClick={() => run(() => archiveSeason(s.id, !s.archived))}>
                      {s.archived ? "Désarchiver" : "Archiver"}
                    </button>
                  )}
                  {!s.is_active && s.teams === 0 && s.players === 0 && (
                    <button type="button" className="btn-secondary" style={{ padding: "4px 10px", fontSize: 12, color: "#f87171" }} disabled={pending}
                      onClick={() => { if (window.confirm(`Supprimer la saison « ${s.label} » ?`)) run(() => deleteSeason(s.id)); }}>
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
        {visible.length === 0 && <li className="text-sm text-faint">Aucune saison. Crée la première avec « + Nouvelle saison ».</li>}
      </ul>
    </div>
  );
}
