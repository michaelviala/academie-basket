import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateAge } from "@/lib/data";
import { addEvaluation, addGoal } from "./actions";
import { GoalStatusForm } from "@/components/goal-status-form";

const EVAL_TYPE_LABELS: Record<string, string> = {
  technique: "Technique",
  tactique: "Tactique",
  physique: "Physique",
  mental: "Mental",
};

export default async function JoueurPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: player } = await supabase
    .from("players")
    .select("*, teams(name, category)")
    .eq("id", id)
    .maybeSingle();

  if (!player) notFound();

  const [{ data: skills }, { data: evaluations }, { data: goals }, { data: attendance }, { data: stats }, { data: devPlan }] =
    await Promise.all([
      supabase.from("skills").select("id, category, name").order("category"),
      supabase
        .from("evaluations")
        .select("*, skills(name)")
        .eq("player_id", id)
        .order("evaluated_at", { ascending: false })
        .limit(30),
      supabase.from("goals").select("*").eq("player_id", id).order("due_date", { ascending: true }),
      supabase.from("attendance").select("status").eq("player_id", id),
      supabase
        .from("player_match_stats")
        .select("*, matches(opponent, date)")
        .eq("player_id", id)
        .order("id", { ascending: false })
        .limit(5),
      supabase.from("development_plans").select("*").eq("player_id", id).maybeSingle(),
    ]);

  const avgByType = (type: string) => {
    const rows = evaluations?.filter((e) => e.evaluation_type === type) ?? [];
    if (rows.length === 0) return null;
    return (rows.reduce((s, r) => s + Number(r.score), 0) / rows.length).toFixed(1);
  };

  const attendanceTotal = attendance?.length ?? 0;
  const attendancePresent = attendance?.filter((a) => a.status === "present").length ?? 0;
  const attendanceRate = attendanceTotal > 0 ? Math.round((attendancePresent / attendanceTotal) * 100) : null;

  // Timeline §31 : entrée académie + évaluations + objectifs atteints
  type TimelineEvent = { date: string; label: string };
  const timeline: TimelineEvent[] = [];
  if (player.entry_date) {
    timeline.push({ date: player.entry_date, label: "Entrée dans l'académie" });
  }
  evaluations?.forEach((e) =>
    timeline.push({
      date: e.evaluated_at,
      label: `Évaluation ${EVAL_TYPE_LABELS[e.evaluation_type]}${e.skills ? ` — ${e.skills.name}` : ""} (${e.score})`,
    })
  );
  goals?.forEach((g) => {
    if (g.status === "atteint" && g.due_date) {
      timeline.push({ date: g.due_date, label: `Objectif atteint : ${g.title}` });
    }
  });
  timeline.sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-6">
      {/* PROFIL */}
      <div className="card flex flex-wrap items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-500">
          {player.first_name[0]}{player.last_name[0]}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{player.first_name} {player.last_name}</h1>
          <p className="text-sm text-slate-500">
            {player.teams?.name ?? "Sans équipe"} ({player.teams?.category ?? "—"}) · {calculateAge(player.birth_date)} ans
            {player.jersey_number ? ` · #${player.jersey_number}` : ""} · {player.primary_position ?? "Poste non défini"}
          </p>
        </div>
        <span className="badge bg-slate-100 text-slate-600">{player.status}</span>
      </div>

      {/* INDICES */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(["technique", "tactique", "physique", "mental"] as const).map((t) => (
          <div key={t} className="card text-center">
            <p className="text-xs font-medium uppercase text-slate-400">{EVAL_TYPE_LABELS[t]}</p>
            <p className="mt-1 text-2xl font-bold">{avgByType(t) ?? "—"}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* EVALUATIONS */}
        <section className="card space-y-4">
          <h2 className="font-semibold">Nouvelle évaluation</h2>
          <form action={addEvaluation.bind(null, player.id)} className="grid grid-cols-2 gap-3">
            <select name="evaluation_type" className="input col-span-2" required defaultValue="">
              <option value="" disabled>Type d&apos;évaluation</option>
              <option value="technique">Technique</option>
              <option value="tactique">Tactique</option>
              <option value="physique">Physique</option>
              <option value="mental">Mental</option>
            </select>
            <select name="skill_id" className="input col-span-2" defaultValue="">
              <option value="">Compétence (optionnel)</option>
              {skills?.map((s) => (
                <option key={s.id} value={s.id}>[{s.category}] {s.name}</option>
              ))}
            </select>
            <input className="input" type="number" name="score" min={1} max={10} step={0.5} placeholder="Score" required />
            <input className="input" type="date" name="evaluated_at" />
            <textarea className="input col-span-2" name="comment" placeholder="Commentaire" rows={2} />
            <button className="btn-primary col-span-2" type="submit">Enregistrer l&apos;évaluation</button>
          </form>

          <div className="max-h-72 space-y-2 overflow-y-auto">
            {evaluations?.slice(0, 10).map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">
                    {EVAL_TYPE_LABELS[e.evaluation_type]} {e.skills ? `— ${e.skills.name}` : ""}
                  </p>
                  <p className="text-xs text-slate-400">{e.evaluated_at}{e.comment ? ` · ${e.comment}` : ""}</p>
                </div>
                <span className="badge bg-orange-100 text-orange-700">{e.score}</span>
              </div>
            ))}
            {(!evaluations || evaluations.length === 0) && (
              <p className="text-sm text-slate-400">Aucune évaluation enregistrée.</p>
            )}
          </div>
        </section>

        {/* OBJECTIFS */}
        <section className="card space-y-4">
          <h2 className="font-semibold">Objectifs individuels</h2>
          <form action={addGoal.bind(null, player.id)} className="space-y-3">
            <input className="input" name="title" placeholder="Titre de l'objectif" required />
            <div className="grid grid-cols-2 gap-3">
              <input className="input" name="category" placeholder="Catégorie" />
              <input className="input" name="priority" placeholder="Priorité" />
              <input className="input" name="initial_level" placeholder="Niveau initial" />
              <input className="input" name="target_level" placeholder="Niveau cible" />
              <input className="input" type="date" name="due_date" />
            </div>
            <textarea className="input" name="description" placeholder="Description" rows={2} />
            <textarea className="input" name="planned_actions" placeholder="Actions prévues" rows={2} />
            <input className="input" name="success_indicator" placeholder="Indicateur de réussite" />
            <button className="btn-primary" type="submit">Ajouter l&apos;objectif</button>
          </form>

          <div className="space-y-2">
            {goals?.map((g) => (
              <div key={g.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{g.title}</p>
                  <GoalStatusForm playerId={player.id} goalId={g.id} currentStatus={g.status} />
                </div>
                {g.due_date && <p className="text-xs text-slate-400">Échéance : {g.due_date}</p>}
              </div>
            ))}
            {(!goals || goals.length === 0) && (
              <p className="text-sm text-slate-400">Aucun objectif défini.</p>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* PRESENCE */}
        <section className="card">
          <h2 className="mb-2 font-semibold">Présence</h2>
          <p className="text-3xl font-bold">{attendanceRate !== null ? `${attendanceRate}%` : "—"}</p>
          <p className="text-xs text-slate-400">{attendancePresent} présences sur {attendanceTotal} enregistrées</p>
        </section>

        {/* STATS */}
        <section className="card">
          <h2 className="mb-2 font-semibold">Derniers matchs</h2>
          <div className="space-y-2">
            {stats?.map((s) => (
              <div key={s.id} className="flex justify-between text-sm">
                <span className="truncate">{s.matches?.opponent}</span>
                <span className="text-slate-400">{s.points} pts</span>
              </div>
            ))}
            {(!stats || stats.length === 0) && <p className="text-sm text-slate-400">Aucune statistique.</p>}
          </div>
        </section>

        {/* PLAN DE DEVELOPPEMENT */}
        <section className="card">
          <h2 className="mb-2 font-semibold">Plan de développement</h2>
          {devPlan ? (
            <div className="space-y-1 text-sm">
              {devPlan.strengths && <p><span className="text-slate-400">Points forts : </span>{devPlan.strengths}</p>}
              {devPlan.weaknesses && <p><span className="text-slate-400">Axes d&apos;amélioration : </span>{devPlan.weaknesses}</p>}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Pas encore de plan de développement.</p>
          )}
        </section>
      </div>

      {/* TIMELINE */}
      <section className="card">
        <h2 className="mb-4 font-semibold">Timeline du joueur</h2>
        <ol className="relative space-y-4 border-l border-slate-200 pl-4">
          {timeline.slice(0, 15).map((ev, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-orange-500" />
              <p className="text-xs text-slate-400">{ev.date}</p>
              <p className="text-sm">{ev.label}</p>
            </li>
          ))}
          {timeline.length === 0 && <p className="text-sm text-slate-400">Pas encore d&apos;historique.</p>}
        </ol>
      </section>
    </div>
  );
}
