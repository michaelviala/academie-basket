import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { calculateAge } from "@/lib/data";
import { formatDateLong } from "@/lib/sessions";
import { attendanceRate } from "@/lib/player-stats";
import { ATTENDANCE_STATUSES } from "@/lib/attendance";

const GOAL_LABELS: Record<string, string> = { a_commencer: "À commencer", en_cours: "En cours", atteint: "Atteint", abandonne: "Abandonné" };

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}

/** Synthèse d'un joueur pour son propre accueil ou celui de ses parents. */
export async function PlayerSummary({ playerId, showName = true }: { playerId: string; showName?: boolean }) {
  const supabase = await createClient();
  const { data: player } = await supabase.from("players").select("id, first_name, last_name, birth_date, team_id, teams(name)").eq("id", playerId).maybeSingle();
  if (!player) return null;

  const today = new Date().toISOString().slice(0, 10);
  const [{ data: evals }, { data: goals }, { data: att }, { data: next }, { data: feedbacks }] = await Promise.all([
    supabase.from("evaluations").select("evaluation_type, score").eq("player_id", playerId),
    supabase.from("goals").select("id, title, status, due_date").eq("player_id", playerId).order("due_date", { ascending: true }),
    supabase.from("attendance").select("status, trainings(date)").eq("player_id", playerId),
    player.team_id
      ? supabase.from("trainings").select("id, date, start_time, objective, gyms(name)").eq("team_id", player.team_id).gte("date", today).order("date").order("start_time").limit(4)
      : Promise.resolve({ data: [] }),
    supabase.from("feedbacks").select("id, positives, improvements, next_session_goal, created_at").eq("player_id", playerId).order("created_at", { ascending: false }).limit(2),
  ]);

  const avg = (type: string) => {
    const r = (evals ?? []).filter((e) => e.evaluation_type === type);
    return r.length ? (r.reduce((s, x) => s + Number(x.score), 0) / r.length).toFixed(1) : "—";
  };
  const statuses = (att ?? []).map((a) => a.status);
  const rate = attendanceRate(statuses);
  const recent = [...(att ?? [])]
    .sort((a, b) => ((b.trainings as { date: string } | null)?.date ?? "").localeCompare((a.trainings as { date: string } | null)?.date ?? ""))
    .slice(0, 8);
  const openGoals = (goals ?? []).filter((g) => g.status === "en_cours" || g.status === "a_commencer");

  return (
    <div className="space-y-6">
      {showName && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="display text-2xl font-bold">{player.first_name} {player.last_name}</h1>
            <p className="text-sm text-dim">{(player.teams as { name: string } | null)?.name ?? "Sans équipe"} · {calculateAge(player.birth_date)} ans</p>
          </div>
          <Link href={`/joueurs/${player.id}`} className="btn-secondary">Fiche complète →</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Technique" value={avg("technique")} />
        <Stat label="Tactique" value={avg("tactique")} />
        <Stat label="Physique" value={avg("physique")} />
        <Stat label="Mental" value={avg("mental")} />
        <Stat label="Présence" value={rate !== null ? `${rate}%` : "—"} hint={statuses.length ? `${statuses.length} séance(s) suivie(s)` : "Pas encore d'appel"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Prochaines séances</h2>
          {(next ?? []).length === 0 ? (
            <p className="text-sm text-faint">Aucune séance planifiée pour le moment.</p>
          ) : (
            <ul className="space-y-1.5">
              {(next ?? []).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surf-2)" }}>
                  <span className="min-w-0 truncate"><b>{formatDateLong(t.date)}</b>{t.start_time ? ` · ${t.start_time.slice(0, 5)}` : ""}{t.objective ? <span className="text-faint"> · {t.objective}</span> : null}</span>
                  <span className="badge shrink-0">{(t.gyms as { name: string } | null)?.name ?? "Salle ?"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Dernières présences</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-faint">Aucune présence enregistrée.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {recent.map((a, i) => {
                const s = ATTENDANCE_STATUSES.find((x) => x.value === a.status);
                const d = (a.trainings as { date: string } | null)?.date;
                return (
                  <span key={i} className="rounded-lg px-2.5 py-1.5 text-xs font-medium" style={{ background: "var(--surf-2)", borderLeft: `3px solid ${s?.color ?? "#999"}` }}>
                    {d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—"} · {s?.label ?? a.status}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Objectifs en cours</h2>
          {openGoals.length === 0 ? (
            <p className="text-sm text-faint">Aucun objectif en cours.</p>
          ) : (
            <ul className="space-y-1.5">
              {openGoals.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surf-2)" }}>
                  <span>{g.title}</span>
                  <span className="badge">{GOAL_LABELS[g.status] ?? g.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h2 className="mb-3 font-semibold">Derniers retours du coach</h2>
          {(feedbacks ?? []).length === 0 ? (
            <p className="text-sm text-faint">Pas encore de retour.</p>
          ) : (
            <ul className="space-y-3">
              {(feedbacks ?? []).map((f) => (
                <li key={f.id} className="space-y-1 text-sm">
                  <p className="text-xs text-faint">{new Date(f.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</p>
                  {f.positives && <p><span style={{ color: "#4ade80" }}>＋</span> {f.positives}</p>}
                  {f.improvements && <p><span style={{ color: "#fbbf24" }}>↗</span> {f.improvements}</p>}
                  {f.next_session_goal && <p className="text-dim">Prochain objectif : {f.next_session_goal}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
