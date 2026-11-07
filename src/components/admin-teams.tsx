"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_CATEGORY_COLORS, teamColor } from "@/lib/category-color";
import { saveTeam, deleteTeam, movePlayer } from "@/app/(app)/administration/teams";

export type AdminTeam = {
  id: string;
  name: string;
  category: string;
  color: string | null;
  seasonId: string;
  coaches: string[];
  players: { id: string; name: string }[];
};
type Season = { id: string; label: string; is_active: boolean };

function TeamForm({ team, seasons, categories, onDone, onError }: { team?: AdminTeam; seasons: Season[]; categories: string[]; onDone: () => void; onError: (m: string) => void }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [color, setColor] = useState(team?.color ?? DEFAULT_CATEGORY_COLORS[0]);
  const active = seasons.find((s) => s.is_active)?.id ?? seasons[0]?.id ?? "";
  return (
    <form
      action={(fd) =>
        start(async () => {
          const r = await saveTeam(team?.id ?? null, fd);
          if (r.error) onError(r.error);
          else { router.refresh(); onDone(); }
        })
      }
      className="grid gap-2 rounded-lg p-3 sm:grid-cols-3"
      style={{ background: "var(--surf-2)" }}
    >
      <div><label className="label">Nom *</label><input className="input" name="name" defaultValue={team?.name} placeholder="U11 Poussins" required /></div>
      <div>
        <label className="label">Code (ex. U11) *</label>
        <input className="input" name="category" list="team-cats" defaultValue={team?.category} placeholder="U11" required />
        <datalist id="team-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      </div>
      <div>
        <label className="label">Saison</label>
        <select className="input" name="season_id" defaultValue={team?.seasonId ?? active}>
          {seasons.map((s) => <option key={s.id} value={s.id}>{s.label}{s.is_active ? " (active)" : ""}</option>)}
        </select>
      </div>
      <div className="sm:col-span-3">
        <label className="label">Couleur de la catégorie (la même partout : carnets techniques, planning, calendrier…)</label>
        <div className="flex flex-wrap items-center gap-2">
          {DEFAULT_CATEGORY_COLORS.map((c) => (
            <button type="button" key={c} onClick={() => setColor(c)} aria-label={c}
              style={{ width: 26, height: 26, borderRadius: 999, background: c, border: color === c ? "3px solid #fff" : "2px solid transparent" }} />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Autre couleur" style={{ width: 34, height: 28, background: "none", border: 0 }} />
          <input type="hidden" name="color" value={color} />
        </div>
      </div>
      <div className="flex gap-2 sm:col-span-3">
        <button className="btn-primary" disabled={pending}>{team ? "Enregistrer" : "Créer la catégorie"}</button>
        <button type="button" className="btn-secondary" onClick={onDone}>Annuler</button>
      </div>
    </form>
  );
}

export function AdminTeams({ teams, seasons, unassigned }: { teams: AdminTeam[]; seasons: Season[]; unassigned: { id: string; name: string }[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const categories = Array.from(new Set(teams.map((t) => t.category)));

  function remove(t: AdminTeam) {
    if (!confirm(`Supprimer la catégorie « ${t.name} » ?`)) return;
    setError(null);
    start(async () => {
      const r = await deleteTeam(t.id);
      if (r.error) setError(r.error); else router.refresh();
    });
  }
  function move(playerId: string, teamId: string) {
    if (!teamId) return;
    setError(null);
    start(async () => {
      const r = await movePlayer(playerId, teamId);
      if (r.error) setError(r.error); else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-faint">Catégories de l&apos;académie, leur saison, leurs coachs et leur effectif.</p>
        {editing !== "new" && <button className="btn-primary" onClick={() => { setError(null); setEditing("new"); }}>+ Nouvelle catégorie</button>}
      </div>
      {error && <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>{error}</p>}
      {editing === "new" && <TeamForm seasons={seasons} categories={categories} onDone={() => setEditing(null)} onError={setError} />}

      <div className="grid gap-3 lg:grid-cols-2">
        {teams.map((t) =>
          editing === t.id ? (
            <TeamForm key={t.id} team={t} seasons={seasons} categories={categories} onDone={() => setEditing(null)} onError={setError} />
          ) : (
            <div key={t.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    <span aria-hidden style={{ display: "inline-block", width: 10, height: 10, borderRadius: 999, background: teamColor(t), marginRight: 8 }} />
                    {t.name} <span className="badge" style={{ borderColor: teamColor(t), color: teamColor(t) }}>{t.category}</span>
                  </p>
                  <p className="text-xs text-faint">
                    {t.coaches.length ? `Coach : ${t.coaches.join(", ")}` : "Aucun coach affecté"} · {seasons.find((s) => s.id === t.seasonId)?.label ?? "—"}
                  </p>
                </div>
                <div className="flex gap-3 text-xs">
                  <button onClick={() => { setError(null); setEditing(t.id); }}>Modifier</button>
                  <button disabled={pending} onClick={() => remove(t)} style={{ color: "#f87171" }}>Supprimer</button>
                </div>
              </div>
              <button className="text-left text-sm" onClick={() => setOpen(open === t.id ? null : t.id)}>
                {t.players.length} joueur{t.players.length > 1 ? "s" : ""} {open === t.id ? "▲" : "▼"}
              </button>
              {open === t.id && (
                <ul className="space-y-1">
                  {t.players.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>{p.name}</span>
                      <select className="input" style={{ width: "auto", padding: "2px 6px", fontSize: 12 }} defaultValue="" onChange={(e) => move(p.id, e.target.value)} disabled={pending}>
                        <option value="" disabled>Déplacer vers…</option>
                        {teams.filter((x) => x.id !== t.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                    </li>
                  ))}
                  {t.players.length === 0 && <li className="text-xs text-faint">Aucun joueur.</li>}
                </ul>
              )}
            </div>
          )
        )}
      </div>
      {teams.length === 0 && (
        <div className="empty">Aucune catégorie pour le moment. Crée la première avec « + Nouvelle catégorie ».</div>
      )}

      {unassigned.length > 0 && (
        <div className="card">
          <h2 className="mb-2 font-semibold">Joueurs sans catégorie ({unassigned.length})</h2>
          <ul className="space-y-1">
            {unassigned.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{p.name}</span>
                <select className="input" style={{ width: "auto", padding: "2px 6px", fontSize: 12 }} defaultValue="" onChange={(e) => move(p.id, e.target.value)} disabled={pending}>
                  <option value="" disabled>Affecter à…</option>
                  {teams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
