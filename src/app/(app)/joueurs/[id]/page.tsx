import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateAge } from "@/lib/data";
import { addEvaluation, addGoal } from "./actions";
import { GoalStatusForm } from "@/components/goal-status-form";
import { PlayerPhoto } from "@/components/player-photo";
import { PlayerEvaluations } from "@/components/player-evaluations";
import { EvaluationForm } from "@/components/evaluation-form";

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

  const [{ data: skills }, { data: evaluations }, { data: goals }, { data: attendance }, { data: devPlan }] =
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
      supabase.from("development_plans").select("*").eq("player_id", id).maybeSingle(),
    ]);

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
        <PlayerPhoto
          playerId={player.id}
          initialPhotoUrl={player.photo_url}
          initials={`${player.first_name[0]}${player.last_name[0]}`}
        />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{player.first_name} {player.last_name}</h1>
          <p className="text-sm" style={{ color: "var(--text-faint)" }}>
            {player.teams?.name ?? "Sans équipe"} ({player.teams?.category ?? "—"}) · {calculateAge(player.birth_date)} ans
            {player.jersey_number ? ` · #${player.jersey_number}` : ""} · {player.primary_position ?? "Poste non défini"}
          </p>
        </div>
        <span className="badge">{player.status}</span>
      </div>

      {/* INDICES CLIQUABLES + PRESENCE */}
      <PlayerEvaluations
        evaluations={evaluations ?? []}
        attendanceRate={attendanceRate}
        attendancePresent={attendancePresent}
        attendanceTotal={attendanceTotal}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* NOUVELLE EVALUATION */}
        <section className="card space-y-4">
          <h2 className="font-semibold">Nouvelle évaluation</h2>
          <EvaluationForm skills={skills ?? []} action={addEvaluation.bind(null, player.id)} />
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
              <label className="col-span-2 -mb-1 text-xs" style={{ color: "var(--text-faint)" }}>
                Date de fin
              </label>
              <input className="input col-span-2" type="date" name="due_date" />
            </div>
            <textarea className="input" name="description" placeholder="Description" rows={2} />
            <textarea className="input" name="planned_actions" placeholder="Actions prévues" rows={2} />
            <input className="input" name="success_indicator" placeholder="Indicateur de réussite" />
            <button className="btn-primary" type="submit">Ajouter l&apos;objectif</button>
          </form>

          <div className="space-y-2">
            {goals?.map((g) => (
              <div key={g.id} className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surf-2)" }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{g.title}</p>
                  <GoalStatusForm playerId={player.id} goalId={g.id} currentStatus={g.status} />
                </div>
                {g.due_date && (
                  <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
                    Fin prévue : {g.due_date}
                  </p>
                )}
              </div>
            ))}
            {(!goals || goals.length === 0) && (
              <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucun objectif défini.</p>
            )}
          </div>
        </section>
      </div>

      {/* PLAN DE DEVELOPPEMENT */}
      <section className="card">
        <h2 className="mb-2 font-semibold">Plan de développement</h2>
        {devPlan ? (
          <div className="space-y-1 text-sm">
            {devPlan.strengths && (
              <p>
                <span style={{ color: "var(--text-faint)" }}>Points forts : </span>
                {devPlan.strengths}
              </p>
            )}
            {devPlan.weaknesses && (
              <p>
                <span style={{ color: "var(--text-faint)" }}>Axes d&apos;amélioration : </span>
                {devPlan.weaknesses}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-faint)" }}>Pas encore de plan de développement.</p>
        )}
      </section>

      {/* TIMELINE */}
      <section className="card">
        <h2 className="mb-4 font-semibold">Timeline du joueur</h2>
        <ol className="relative space-y-4 pl-4" style={{ borderLeft: "1px solid var(--border)" }}>
          {timeline.slice(0, 15).map((ev, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full" style={{ background: "var(--brand)" }} />
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>{ev.date}</p>
              <p className="text-sm">{ev.label}</p>
            </li>
          ))}
          {timeline.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-faint)" }}>Pas encore d&apos;historique.</p>
          )}
        </ol>
      </section>
    </div>
  );
}
