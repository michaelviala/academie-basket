import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateAge, getClubSettings, requireProfile } from "@/lib/data";
import { EVAL_LABELS, EVAL_TYPES, attendanceRate, typeAverages } from "@/lib/player-stats";
import { ATTENDANCE_STATUSES } from "@/lib/attendance";
import { PrintButton } from "@/components/print-button";

const GOAL_LABELS: Record<string, string> = { a_commencer: "À commencer", en_cours: "En cours", atteint: "Atteint", abandonne: "Abandonné" };

export default async function RapportJoueurPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: player } = await supabase.from("players").select("*, teams(name, category)").eq("id", id).maybeSingle();
  if (!player) notFound();

  const [{ data: evals }, { data: goals }, { data: att }, { data: feedbacks }, { data: teamMates }, settings] = await Promise.all([
    supabase.from("evaluations").select("evaluation_type, score, evaluated_at, skills(name)").eq("player_id", id).order("evaluated_at", { ascending: false }),
    supabase.from("goals").select("title, status, due_date").eq("player_id", id).order("due_date"),
    supabase.from("attendance").select("status").eq("player_id", id),
    supabase.from("feedbacks").select("positives, improvements, next_session_goal, created_at").eq("player_id", id).order("created_at", { ascending: false }).limit(5),
    player.team_id ? supabase.from("players").select("id").eq("team_id", player.team_id) : Promise.resolve({ data: [] }),
    getClubSettings(),
  ]);

  // Moyenne de la catégorie par type d'évaluation (si le profil peut voir les évaluations des coéquipiers)
  const mateIds = (teamMates ?? []).map((p) => p.id).filter((x) => x !== id);
  const { data: mateEvals } = mateIds.length && ["admin", "directeur_sportif", "coach", "preparateur_physique"].includes(profile.role)
    ? await supabase.from("evaluations").select("evaluation_type, score, evaluated_at").in("player_id", mateIds)
    : { data: [] };

  const ev = (evals ?? []).map((e) => ({ ...e, score: Number(e.score) }));
  const mine = typeAverages(ev);
  const team = typeAverages((mateEvals ?? []).map((e) => ({ ...e, score: Number(e.score) })));
  const statuses = (att ?? []).map((a) => a.status);
  const rate = attendanceRate(statuses);
  const counts = ATTENDANCE_STATUSES.map((s) => ({ label: s.label, n: statuses.filter((x) => x === s.value).length })).filter((c) => c.n > 0);

  // Dernière note par compétence
  const lastBySkill = new Map<string, { skill: string; type: string; score: number }>();
  for (const e of ev) {
    const name = (e.skills as { name: string } | null)?.name;
    if (!name || lastBySkill.has(`${e.evaluation_type}|${name}`)) continue;
    lastBySkill.set(`${e.evaluation_type}|${name}`, { skill: name, type: e.evaluation_type, score: e.score });
  }

  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href={`/joueurs/${id}`} className="text-xs text-faint">← Retour à la fiche</Link>
        <PrintButton />
      </div>

      <article className="report">
        <header className="flex items-center justify-between gap-4 border-b pb-4" style={{ borderColor: "#ddd" }}>
          <div className="flex items-center gap-3">
            {player.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.photo_url} alt="" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 12, border: "2px solid #ddd" }} />
            ) : (
              <div style={{ width: 84, height: 84, borderRadius: 12, border: "2px solid #ddd", background: "#f1f1f4", color: "#888", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800 }}>
                {`${player.first_name[0] ?? ""}${player.last_name[0] ?? ""}`.toUpperCase()}
              </div>
            )}
            <div>
              <p style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 2, color: "#777" }}>Académie Basket · Bilan joueur</p>
              <h1 style={{ fontSize: 26, fontWeight: 800 }}>{player.first_name} {player.last_name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div style={{ textAlign: "right", fontSize: 13, color: "#555" }}>
              <p>{(player.teams as { name: string } | null)?.name ?? "Sans catégorie"}</p>
              <p>{calculateAge(player.birth_date)} ans{player.primary_position ? ` · ${player.primary_position}` : ""}</p>
              <p>Édité le {today}</p>
            </div>
            {settings.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logo_url} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10 }} />
            )}
          </div>
        </header>

        <h2>Indices de progression</h2>
        <table>
          <thead><tr><th></th>{EVAL_TYPES.map((t) => <th key={t}>{EVAL_LABELS[t]}</th>)}</tr></thead>
          <tbody>
            <tr><td><b>{player.first_name}</b></td>{EVAL_TYPES.map((t) => <td key={t}>{mine[t] !== null ? Number(mine[t]).toFixed(1) : "—"}</td>)}</tr>
            {(mateEvals ?? []).length > 0 && (
              <tr><td>Moyenne de la catégorie</td>{EVAL_TYPES.map((t) => <td key={t}>{team[t] !== null ? Number(team[t]).toFixed(1) : "—"}</td>)}</tr>
            )}
          </tbody>
        </table>

        <h2>Assiduité</h2>
        <p>
          {rate !== null ? <><b>{rate}%</b> de présence sur {statuses.length} séance(s)</> : "Pas encore de présence enregistrée."}
          {counts.length > 0 && <> — {counts.map((c) => `${c.label} : ${c.n}`).join(", ")}</>}
        </p>

        {lastBySkill.size > 0 && (
          <>
            <h2>Compétences évaluées (dernière note)</h2>
            <table>
              <thead><tr><th>Domaine</th><th>Compétence</th><th>Note /10</th></tr></thead>
              <tbody>
                {[...lastBySkill.values()].sort((a, b) => a.type.localeCompare(b.type) || a.skill.localeCompare(b.skill)).map((s, i) => (
                  <tr key={i}><td>{EVAL_LABELS[s.type as keyof typeof EVAL_LABELS] ?? s.type}</td><td>{s.skill}</td><td>{s.score}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2>Objectifs</h2>
        {(goals ?? []).length === 0 ? <p>Aucun objectif défini.</p> : (
          <ul>
            {(goals ?? []).map((g, i) => (
              <li key={i}>{g.title} — <i>{GOAL_LABELS[g.status] ?? g.status}</i>{g.due_date ? ` (échéance ${new Date(g.due_date).toLocaleDateString("fr-FR")})` : ""}</li>
            ))}
          </ul>
        )}

        <h2>Retours du coach</h2>
        {(feedbacks ?? []).length === 0 ? <p>Pas encore de retour.</p> : (
          (feedbacks ?? []).map((f, i) => (
            <div key={i} style={{ marginBottom: 10, breakInside: "avoid" }}>
              <p style={{ fontSize: 12, color: "#777" }}>{new Date(f.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
              {f.positives && <p>＋ {f.positives}</p>}
              {f.improvements && <p>↗ {f.improvements}</p>}
              {f.next_session_goal && <p>Prochain objectif : {f.next_session_goal}</p>}
            </div>
          ))
        )}
      </article>
    </div>
  );
}
