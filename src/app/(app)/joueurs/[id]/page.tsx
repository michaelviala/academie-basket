import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateAge } from "@/lib/data";
import { addEvaluation, addGoal, addSelfAssessment, updateDevelopmentPlan } from "./actions";
import { GoalStatusForm } from "@/components/goal-status-form";
import { PlayerPhoto } from "@/components/player-photo";
import { PlayerEvaluations } from "@/components/player-evaluations";
import { EvaluationForm } from "@/components/evaluation-form";
import { DevelopmentPlanForm } from "@/components/development-plan-form";
import { SelfAssessmentForm } from "@/components/self-assessment-form";

const EVAL_TYPE_LABELS: Record<string, string> = {
  technique: "Technique",
  tactique: "Tactique",
  physique: "Physique",
  mental: "Mental",
};

const SKILL_CATEGORY_ORDER = [
  "tir",
  "dribble",
  "finition",
  "passe",
  "defense",
  "rebond",
  "tactique",
  "physique",
  "mental",
] as const;

const SKILL_CATEGORY_LABELS: Record<string, string> = {
  tir: "Tir",
  dribble: "Dribble",
  finition: "Finition",
  passe: "Passe",
  defense: "Défense",
  rebond: "Rebond",
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

  const [{ data: skills }, { data: evaluations }, { data: goals }, { data: attendance }, { data: devPlan }, { data: selfAssessments }] =
    await Promise.all([
      supabase.from("skills").select("id, category, name").order("category"),
      supabase
        .from("evaluations")
        .select("*, skills(name, category)")
        .eq("player_id", id)
        .order("evaluated_at", { ascending: false })
        .limit(30),
      supabase.from("goals").select("*").eq("player_id", id).order("due_date", { ascending: true }),
      supabase.from("attendance").select("status").eq("player_id", id),
      supabase.from("development_plans").select("*").eq("player_id", id).maybeSingle(),
      supabase
        .from("self_assessments")
        .select("*")
        .eq("player_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
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

  // Moyenne globale : moyenne des 4 moyennes par rubrique (technique/tactique/physique/mental)
  const EVAL_TYPES = ["technique", "tactique", "physique", "mental"] as const;
  const avgByType = (type: string) => {
    const rows = (evaluations ?? []).filter((e) => e.evaluation_type === type);
    if (rows.length === 0) return null;
    return rows.reduce((s, r) => s + Number(r.score), 0) / rows.length;
  };
  const typeAverages = EVAL_TYPES.map((t) => avgByType(t)).filter((v): v is number => v !== null);
  const globalAverage = typeAverages.length > 0 ? typeAverages.reduce((s, v) => s + v, 0) / typeAverages.length : null;

  // Carnet technique : apprentissages (évaluations liées à une compétence) groupés par catégorie
  type LogbookEntry = {
    id: string;
    skillName: string;
    score: number;
    comment: string | null;
    evaluated_at: string;
  };
  const logbookByCategory = new Map<string, LogbookEntry[]>();
  evaluations?.forEach((e) => {
    if (!e.skills) return;
    const category = e.skills.category;
    const list = logbookByCategory.get(category) ?? [];
    list.push({ id: e.id, skillName: e.skills.name, score: Number(e.score), comment: e.comment, evaluated_at: e.evaluated_at });
    logbookByCategory.set(category, list);
  });

  return (
    <div className="space-y-6">
      {/* PROFIL */}
      <div className="flex flex-wrap items-stretch gap-4">
        <div className="card flex flex-1 flex-wrap items-start gap-4" style={{ minWidth: 280 }}>
          <PlayerPhoto
            playerId={player.id}
            initialPhotoUrl={player.photo_url}
            initials={`${player.first_name[0]}${player.last_name[0]}`}
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold">{player.first_name} {player.last_name}</h1>
              <span className="badge">{player.status}</span>
            </div>

            {/* ACTIONS RAPIDES */}
            <div className="mt-3 flex flex-wrap gap-2">
              <a href="#nouvelle-evaluation" className="btn-secondary">+ Ajouter une évaluation</a>
              <a href="#nouvel-objectif" className="btn-secondary">+ Ajouter un objectif</a>
              <a href="#historique" className="btn-secondary">Voir l&apos;historique</a>
            </div>

            <p className="mt-3 text-sm" style={{ color: "var(--text-faint)" }}>
              {player.teams?.name ?? "Sans équipe"} ({player.teams?.category ?? "—"}) · {calculateAge(player.birth_date)} ans
              {player.jersey_number ? ` · #${player.jersey_number}` : ""} · {player.primary_position ?? "Poste non défini"}
            </p>
          </div>
        </div>

        <div
          className="card flex flex-col items-center justify-center text-center"
          style={{ width: 176, flexShrink: 0 }}
        >
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
            Moyenne globale
          </p>
          <p className="display mt-1 text-4xl font-bold" style={{ color: "var(--text)" }}>
            {globalAverage !== null ? globalAverage.toFixed(1) : "—"}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
            Technique, tactique,
            <br />
            physique, mental
          </p>
        </div>
      </div>

      {/* INDICES CLIQUABLES + PRESENCE + HISTORIQUE */}
      <div id="historique">
        <PlayerEvaluations
          evaluations={evaluations ?? []}
          attendanceRate={attendanceRate}
          attendancePresent={attendancePresent}
          attendanceTotal={attendanceTotal}
        />
      </div>

      {/* NOUVELLE EVALUATION */}
      <section id="nouvelle-evaluation" className="card space-y-4">
        <h2 className="font-semibold">Nouvelle évaluation</h2>
        <EvaluationForm skills={skills ?? []} action={addEvaluation.bind(null, player.id)} />
      </section>

      {/* PLAN DE DEVELOPPEMENT (points forts / axes + objectifs) */}
      <section className="card space-y-6">
        <div>
          <h2 className="mb-3 font-semibold">Plan de développement</h2>
          <DevelopmentPlanForm
            playerId={player.id}
            initialStrengths={devPlan?.strengths ?? ""}
            initialWeaknesses={devPlan?.weaknesses ?? ""}
            action={updateDevelopmentPlan}
          />
        </div>

        <div id="nouvel-objectif" style={{ borderTop: "1px solid var(--border)", paddingTop: "1.25rem" }}>
          <h3 className="mb-3 font-semibold">Objectifs individuels</h3>
          <form action={addGoal.bind(null, player.id)} className="mb-4 grid gap-3 sm:grid-cols-2">
            <input className="input sm:col-span-2" name="title" placeholder="Titre de l'objectif" required />
            <input className="input" name="category" placeholder="Catégorie" />
            <input className="input" name="priority" placeholder="Priorité" />
            <input className="input" name="initial_level" placeholder="Niveau initial" />
            <input className="input" name="target_level" placeholder="Niveau cible" />
            <label className="-mb-1 text-xs sm:col-span-2" style={{ color: "var(--text-faint)" }}>
              Date de fin
            </label>
            <input className="input sm:col-span-2" type="date" name="due_date" />
            <textarea className="input sm:col-span-2" name="description" placeholder="Description" rows={2} />
            <textarea className="input sm:col-span-2" name="planned_actions" placeholder="Actions prévues" rows={2} />
            <input className="input sm:col-span-2" name="success_indicator" placeholder="Indicateur de réussite" />
            <button className="btn-primary sm:col-span-2" type="submit">Ajouter l&apos;objectif</button>
          </form>

          <div className="grid gap-2 sm:grid-cols-2">
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
        </div>
      </section>

      {/* AUTO-EVALUATION JOUEUR */}
      <section className="card">
        <h2 className="mb-1 font-semibold">Auto-évaluation</h2>
        <p className="mb-4 text-xs" style={{ color: "var(--text-faint)" }}>
          À remplir par le joueur lui-même, régulièrement.
        </p>
        <SelfAssessmentForm playerId={player.id} history={selfAssessments ?? []} action={addSelfAssessment} />
      </section>

      {/* CARNET TECHNIQUE */}
      <section className="card">
        <h2 className="mb-1 font-semibold">Carnet technique</h2>
        <p className="mb-4 text-xs" style={{ color: "var(--text-faint)" }}>
          Apprentissages enregistrés, regroupés par catégorie de compétence.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SKILL_CATEGORY_ORDER.filter((cat) => logbookByCategory.has(cat)).map((cat) => (
            <div key={cat} className="rounded-lg p-3" style={{ background: "var(--surf-2)" }}>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
                {SKILL_CATEGORY_LABELS[cat]}
              </p>
              <div className="space-y-2">
                {logbookByCategory.get(cat)!.map((entry) => (
                  <div key={entry.id} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{entry.skillName}</span>
                      <span className="badge" style={{ background: "rgba(255,106,31,0.14)", color: "var(--text)", borderColor: "transparent" }}>
                        {entry.score}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                      {entry.evaluated_at}
                      {entry.comment ? ` · ${entry.comment}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {logbookByCategory.size === 0 && (
            <p className="text-sm" style={{ color: "var(--text-faint)" }}>
              Aucun apprentissage enregistré pour l&apos;instant. Lie une évaluation à une compétence pour l&apos;ajouter ici.
            </p>
          )}
        </div>
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
