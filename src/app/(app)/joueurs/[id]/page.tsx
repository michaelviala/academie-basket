import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { calculateAge, getClubSettings, requireProfile } from "@/lib/data";
import { getCategoryColors } from "@/lib/technical-guide-data";
import {
  EVAL_COLORS,
  EVAL_LABELS,
  EVAL_TYPES,
  attendanceRate as computeAttendanceRate,
  categoryColor,
  daysSince,
  formatDateFr,
  globalAverage,
  scoreColor,
  tint,
  trend,
  typeAverages,
  type EvalType,
} from "@/lib/player-stats";
import {
  addEvaluation,
  addGoal,
  addMeeting,
  addPhysicalTest,
  addSelfAssessment,
  declareInjury,
  deleteInjury,
  deletePhysicalTest,
  updateDevelopmentPlan,
  updateInjury,
} from "./actions";
import { GoalStatusForm } from "@/components/goal-status-form";
import { MeasurementsHistory } from "@/components/measurements-history";
import { PlayerFacts } from "@/components/player-facts";
import { PlayerPhoto } from "@/components/player-photo";
import { AddPlayerVideo, PlayerClipList, type TrainingOption } from "@/components/player-video";
import { loadPlayerClips } from "@/lib/player-clips";
import { PlayerEvaluations } from "@/components/player-evaluations";
import { PlayerRadar } from "@/components/player-radar";
import { EvaluationForm } from "@/components/evaluation-form";
import { DevelopmentPlanForm } from "@/components/development-plan-form";
import { SelfAssessmentForm } from "@/components/self-assessment-form";
import { PhysicalTests } from "@/components/physical-tests";
import { Injuries } from "@/components/injuries";
import { Meetings } from "@/components/meetings";

const TABS = [
  { key: "apercu", label: "Vue d'ensemble" },
  { key: "evaluations", label: "Évaluations" },
  { key: "objectifs", label: "Objectifs & plan" },
  { key: "physique", label: "Physique" },
  { key: "suivi", label: "Suivi" },
  { key: "blessures", label: "Blessures", restricted: true },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const STATUS_LABELS: Record<string, string> = { actif: "Actif", inactif: "Inactif", blesse: "Blessé", parti: "Parti" };
const STATUS_COLORS: Record<string, string> = {
  actif: "var(--green)",
  inactif: "var(--text-faint)",
  blesse: "var(--red)",
  parti: "var(--text-faint)",
};

const GOAL_STEPS = ["a_commencer", "en_cours", "partiellement_atteint", "atteint"] as const;
const GOAL_LABELS: Record<string, string> = {
  a_commencer: "À commencer",
  en_cours: "En cours",
  partiellement_atteint: "Partiellement atteint",
  atteint: "Atteint",
  abandonne: "Abandonné",
};
const GOAL_COLORS: Record<string, string> = {
  a_commencer: "var(--text-faint)",
  en_cours: "var(--blue)",
  partiellement_atteint: "var(--amber)",
  atteint: "var(--green)",
  abandonne: "var(--red)",
};

type Goal = {
  id: string;
  title: string;
  category: string | null;
  priority: string | null;
  due_date: string | null;
  status: string;
  description: string | null;
  target_level: string | null;
};

function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="display flex items-center gap-3 text-xl font-bold uppercase">
        <span className="h-5 w-1.5 rounded" style={{ background: "var(--brand)" }} />
        {children}
      </h2>
      {hint && (
        <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function TrendBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>Pas encore comparable</span>;
  const up = delta > 0.05;
  const down = delta < -0.05;
  const color = up ? "var(--green)" : down ? "var(--red)" : "var(--text-faint)";
  return (
    <span className="text-[11px] font-semibold" style={{ color }}>
      {up ? "▲" : down ? "▼" : "■"} {delta > 0 ? "+" : ""}
      {delta.toFixed(1)} <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>vs 3 mois avant</span>
    </span>
  );
}

function IndexTile({ label, value, delta, count, color, href }: { label: string; value: number | null; delta: number | null; count: number; color: string; href: string }) {
  return (
    <Link href={href} scroll={false} title={`Voir les évaluations ${label.toLowerCase()}`} className="block rounded-xl p-4 transition-transform hover:-translate-y-0.5" style={{ background: "var(--surf)", border: "1px solid var(--border)", borderTop: `3px solid ${color}` }}>
      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
        {label}
      </p>
      <p className="display mt-1 text-4xl font-bold leading-none" style={{ color: scoreColor(value) }}>
        {value !== null ? value.toFixed(1) : "—"}
        <span className="ml-1 text-sm font-medium" style={{ color: "var(--text-faint)" }}>
          /10
        </span>
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surf-2)" }}>
        <div className="h-full rounded-full" style={{ width: `${value !== null ? value * 10 : 0}%`, background: color }} />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
        <TrendBadge delta={delta} />
        <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
          {count} éval. →
        </span>
      </div>
    </Link>
  );
}

function GoalCard({ goal, playerId, editable }: { goal: Goal; playerId: string; editable?: boolean }) {
  const color = GOAL_COLORS[goal.status] ?? "var(--text-faint)";
  const stepIndex = GOAL_STEPS.indexOf(goal.status as (typeof GOAL_STEPS)[number]);
  const closed = goal.status === "atteint" || goal.status === "abandonne";
  const dueIn = goal.due_date ? -(daysSince(goal.due_date) ?? 0) : null; // jours restants (négatif = dépassé)
  const late = !closed && dueIn !== null && dueIn < 0;

  return (
    <div className="rounded-xl p-4" style={{ background: "var(--surf-2)", border: `1px solid ${late ? tint("#ef4444", 50) : "var(--border)"}` }}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold leading-snug">{goal.title}</p>
        {editable ? (
          <GoalStatusForm playerId={playerId} goalId={goal.id} currentStatus={goal.status} />
        ) : (
          <span className="chip shrink-0" style={{ color, borderColor: tint(color, 50) }}>
            {GOAL_LABELS[goal.status]}
          </span>
        )}
      </div>
      <div className="mt-3 flex gap-1" aria-label={`Avancement : ${GOAL_LABELS[goal.status]}`}>
        {GOAL_STEPS.map((s, i) => (
          <div key={s} className="h-1.5 flex-1 rounded-full" style={{ background: stepIndex >= i && goal.status !== "abandonne" ? color : "var(--border)" }} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: "var(--text-faint)" }}>
        {goal.category && <span className="chip">{goal.category}</span>}
        {goal.priority && <span className="chip">Priorité {goal.priority.toLowerCase()}</span>}
        {goal.target_level && <span>Cible : {goal.target_level}</span>}
        {goal.due_date && (
          <span className="ml-auto font-semibold" style={{ color: late ? "var(--red)" : "var(--text-dim)" }}>
            {closed ? `Échéance ${formatDateFr(goal.due_date)}` : late ? `En retard de ${-dueIn!} j` : `Dans ${dueIn} j`}
          </span>
        )}
      </div>
    </div>
  );
}

export default async function JoueurPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; type?: string }>;
}) {
  const { id } = await params;
  const { tab, type } = await searchParams;
  const initialType = EVAL_TYPES.find((t) => t === type) ?? "technique";
  const profile = await requireProfile();
  const supabase = await createClient();
  const canSeeInjuries = ["admin", "directeur_sportif", "preparateur_physique"].includes(profile.role);

  const { data: player } = await supabase.from("players").select("*, teams(name, category)").eq("id", id).maybeSingle();
  if (!player) notFound();

  const [
    { data: skills },
    { data: evaluations },
    { data: goals },
    { data: attendance },
    { data: devPlan },
    { data: selfAssessments },
    { data: physicalTests },
    { data: measurements },
    { data: meetings },
    { data: feedbacks },
    settings,
    colors,
  ] = await Promise.all([
    supabase.from("skills").select("id, category, name").order("category"),
    supabase
      .from("evaluations")
      .select("*, skills(name, category)")
      .eq("player_id", id)
      .order("evaluated_at", { ascending: false })
      .limit(300),
    supabase.from("goals").select("*").eq("player_id", id).order("due_date", { ascending: true }),
    supabase.from("attendance").select("status").eq("player_id", id),
    supabase.from("development_plans").select("*").eq("player_id", id).maybeSingle(),
    supabase.from("self_assessments").select("*").eq("player_id", id).order("created_at", { ascending: false }).limit(10),
    supabase
      .from("physical_tests")
      .select("id, test_type, result, unit, test_date, comment")
      .eq("player_id", id)
      .order("test_date", { ascending: false }),
    supabase.from("player_measurements").select("id, measured_at, height_cm, weight_kg, wingspan_cm").eq("player_id", id).order("measured_at"),
    supabase.from("meetings").select("id, meeting_date, participants, summary").eq("player_id", id).order("meeting_date", { ascending: false }),
    supabase
      .from("feedbacks")
      .select("id, positives, improvements, priority, next_session_goal, created_at")
      .eq("player_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    getClubSettings(),
    getCategoryColors(),
  ]);

  const canManageVideos = ["admin", "directeur_sportif", "coach"].includes(profile.role);
  const canSeeVideos = canManageVideos || profile.role === "preparateur_physique";
  const playerClips = canSeeVideos ? await loadPlayerClips(supabase, { playerId: id }) : [];
  let trainingOptions: TrainingOption[] = [];
  if (canManageVideos && player.team_id) {
    const { data: tr } = await supabase
      .from("trainings")
      .select("id, date")
      .eq("team_id", player.team_id)
      .order("date", { ascending: false })
      .limit(15);
    trainingOptions = (tr ?? []).map((t) => ({
      id: t.id,
      label: `Séance du ${new Date(t.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}`,
    }));
  }

  const staffView = ["admin", "directeur_sportif", "coach"].includes(profile.role);
  const { data: guardians } = staffView
    ? await supabase.from("player_guardians").select("id, full_name, relationship, email, phone, is_primary").eq("player_id", id).order("is_primary", { ascending: false })
    : { data: null };

  const { data: injuries } = canSeeInjuries
    ? await supabase
        .from("injuries")
        .select("id, injury_type, zone, start_date, estimated_duration, restrictions, return_protocol, expected_return_date, status, comment")
        .eq("player_id", id)
        .order("start_date", { ascending: false })
    : { data: null };

  const ev = evaluations ?? [];
  const evaluatorIds = Array.from(new Set(ev.map((e) => e.evaluator_id).filter((v): v is string => !!v)));
  const evaluatorNames: Record<string, string> = {};
  if (evaluatorIds.length > 0) {
    const { data: evaluators } = await supabase.from("profiles").select("id, full_name").in("id", evaluatorIds);
    evaluators?.forEach((u) => {
      evaluatorNames[u.id] = u.full_name;
    });
  }
  const goalList = (goals ?? []) as Goal[];
  const attendanceStatuses = (attendance ?? []).map((a) => a.status);
  const attendancePresent = attendanceStatuses.filter((s) => s === "present" || s === "retard").length;
  const attendanceTotal = attendanceStatuses.length;
  const attendanceRate = computeAttendanceRate(attendanceStatuses);

  const avgs = typeAverages(ev);
  const gAvg = globalAverage(ev);
  const gTrend = trend(ev);
  const color = categoryColor(colors, player.teams?.category);

  const activeTab: TabKey = TABS.some((t) => t.key === tab && (!("restricted" in t) || canSeeInjuries)) ? (tab as TabKey) : "apercu";
  const visibleTabs = TABS.filter((t) => !("restricted" in t) || canSeeInjuries);
  const tabCounts: Partial<Record<TabKey, number>> = {
    evaluations: ev.length,
    objectifs: goalList.length,
    physique: physicalTests?.length ?? 0,
    suivi: (feedbacks?.length ?? 0) + (meetings?.length ?? 0) + (selfAssessments?.length ?? 0),
    blessures: injuries?.length ?? 0,
  };

  // Radar : 90 derniers jours vs 90 jours précédents (repli sur l'ensemble si rien de récent)
  const recentEv = ev.filter((e) => (daysSince(e.evaluated_at) ?? 9999) <= 90);
  const previousEv = ev.filter((e) => {
    const d = daysSince(e.evaluated_at) ?? 9999;
    return d > 90 && d <= 180;
  });
  const radarNow = typeAverages(recentEv.length > 0 ? recentEv : ev);
  const radarBefore = typeAverages(previousEv);
  const radarData = EVAL_TYPES.map((t) => ({ axis: EVAL_LABELS[t], current: radarNow[t], previous: radarBefore[t] }));

  const goalsInProgress = goalList.filter((g) => g.status === "en_cours" || g.status === "a_commencer");
  const goalsAchieved = goalList.filter((g) => g.status === "atteint").length;

  // Timeline : parcours du joueur, du plus récent au plus ancien
  type TimelineEvent = { date: string; label: string; detail?: string; color: string };
  const timeline: TimelineEvent[] = [];
  if (player.entry_date) timeline.push({ date: player.entry_date, label: "Entrée dans l'académie", color: "var(--brand)" });
  const evalGroups = new Map<string, { type: EvalType; date: string; scores: number[] }>();
  ev.forEach((e) => {
    const key = `${e.evaluation_type}|${e.evaluated_at.slice(0, 7)}`;
    const g = evalGroups.get(key) ?? { type: e.evaluation_type as EvalType, date: e.evaluated_at, scores: [] };
    g.scores.push(Number(e.score));
    if (e.evaluated_at > g.date) g.date = e.evaluated_at;
    evalGroups.set(key, g);
  });
  evalGroups.forEach((g) =>
    timeline.push({
      date: g.date,
      label: `Évaluation ${EVAL_LABELS[g.type].toLowerCase()}`,
      detail: `${(g.scores.reduce((s, v) => s + v, 0) / g.scores.length).toFixed(1)}/10 · ${g.scores.length} compétence${g.scores.length > 1 ? "s" : ""}`,
      color: EVAL_COLORS[g.type],
    })
  );
  goalList.forEach((g) => {
    if (g.status === "atteint" && g.due_date) timeline.push({ date: g.due_date, label: "Objectif atteint", detail: g.title, color: "var(--green)" });
  });
  meetings?.forEach((m) => timeline.push({ date: m.meeting_date, label: "Réunion de suivi", detail: m.participants ?? undefined, color: "var(--blue)" }));
  injuries?.forEach((i) => timeline.push({ date: i.start_date, label: "Blessure", detail: `${i.injury_type}${i.zone ? ` · ${i.zone}` : ""}`, color: "var(--red)" }));
  const testsByDate = new Map<string, number>();
  physicalTests?.forEach((t) => testsByDate.set(t.test_date, (testsByDate.get(t.test_date) ?? 0) + 1));
  testsByDate.forEach((n, date) => timeline.push({ date, label: "Tests physiques", detail: `${n} test${n > 1 ? "s" : ""}`, color: "var(--text-dim)" }));
  timeline.sort((a, b) => (a.date < b.date ? 1 : -1));

  // Instantané pour la réunion de suivi
  const meetingSnapshot = {
    typeAverages: EVAL_TYPES.map((t) => ({ label: EVAL_LABELS[t], value: avgs[t] })),
    attendanceRate,
    attendancePresent,
    attendanceTotal,
    goalsInProgress: goalList.filter((g) => g.status === "en_cours").length,
    goalsAchieved,
    lastFeedback: feedbacks?.[0] ? [feedbacks[0].positives, feedbacks[0].improvements].filter(Boolean).join(" · ") || null : null,
  };

  const ringLen = 2 * Math.PI * 44;

  return (
    <div className="space-y-6">
      {/* ===== PROFIL ===== */}
      <section
        className="card relative overflow-hidden"
        style={{ borderColor: tint(color, 40), background: `linear-gradient(135deg, ${tint(color, 14)}, var(--surf) 60%)` }}
      >
        <Link href="/joueurs" className="text-xs" style={{ color: "var(--text-faint)" }}>
          ← Tous les joueurs
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-6">
          <PlayerPhoto
            playerId={player.id}
            initialPhotoUrl={player.photo_url}
            initials={`${player.first_name[0]}${player.last_name[0]}`}
            size={104}
            ringColor={color}
          />
          <div className="min-w-0 flex-1" style={{ minWidth: 240 }}>
            <h1 className="display text-4xl font-bold uppercase leading-none">
              {player.first_name} <span style={{ color }}>{player.last_name}</span>
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="chip" style={{ background: tint(color, 16), color, borderColor: tint(color, 45) }}>
                {player.teams?.category ?? "—"}
              </span>
              {player.teams?.name && <span className="chip">{player.teams.name}</span>}
              {player.jersey_number && <span className="chip">#{player.jersey_number}</span>}
              <span className="chip">
                {player.primary_position ?? "Poste non défini"}
                {player.secondary_position ? ` / ${player.secondary_position}` : ""}
              </span>
              <span className="chip">{calculateAge(player.birth_date)} ans</span>
              <span className="chip" style={{ color: STATUS_COLORS[player.status], borderColor: tint(STATUS_COLORS[player.status], 50) }}>
                {STATUS_LABELS[player.status]}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/joueurs/${player.id}?tab=evaluations#nouvelle-evaluation`} className="btn-primary">
                + Évaluation
              </Link>
              <Link href={`/joueurs/${player.id}?tab=objectifs#nouvel-objectif`} className="btn-secondary">
                + Objectif
              </Link>
              {canManageVideos && (
                <AddPlayerVideo
                  playerId={player.id}
                  playerName={`${player.first_name} ${player.last_name}`}
                  trainings={trainingOptions}
                  label="+ Feedback vidéo"
                />
              )}
              <Link
                href={player.teams?.category ? `/carnet-technique?cat=${encodeURIComponent(player.teams.category)}` : "/carnet-technique"}
                className="btn-secondary"
              >
                Carnet technique{player.teams?.category ? ` ${player.teams.category}` : ""}
              </Link>
              <Link href={`/joueurs/${player.id}/rapport`} className="btn-secondary">
                Bilan PDF
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative h-28 w-28 shrink-0">
              <svg width="112" height="112" viewBox="0 0 112 112" aria-hidden>
                <circle cx="56" cy="56" r="44" fill="none" stroke="var(--surf-2)" strokeWidth="9" />
                <circle
                  cx="56"
                  cy="56"
                  r="44"
                  fill="none"
                  stroke={scoreColor(gAvg)}
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={ringLen}
                  strokeDashoffset={gAvg !== null ? ringLen * (1 - gAvg / 10) : ringLen}
                  transform="rotate(-90 56 56)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="display text-3xl font-bold leading-none">{gAvg !== null ? gAvg.toFixed(1) : "—"}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
                  Moyenne
                </span>
              </div>
            </div>
            <div className="hidden text-xs sm:block" style={{ color: "var(--text-faint)" }}>
              <p>Moyenne globale</p>
              <p>sur 10</p>
              <div className="mt-1">
                <TrendBadge delta={gTrend} />
              </div>
            </div>
          </div>
        </div>

        <PlayerFacts
          playerId={player.id}
          canEdit={staffView}
          entry={player.entry_date ? formatDateFr(player.entry_date) : "—"}
          height={player.height_cm}
          weight={player.weight_kg}
          wingspan={player.wingspan_cm}
          hand={player.dominant_hand}
          previousClub={player.previous_club}
        />
      </section>

      {staffView && (
        <section className="card" aria-label="Parents et responsables">
          <h2 className="mb-2 text-sm font-semibold">Parents / responsables</h2>
          {(guardians ?? []).length === 0 ? (
            <p className="text-sm text-faint">Aucun parent renseigné. {profile.role === "coach" ? "Demande à la direction de les ajouter." : <Link href="/administration" className="underline">Les ajouter dans l&apos;administration</Link>}</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {(guardians ?? []).map((g) => (
                <li key={g.id} className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surf-2)" }}>
                  <p className="font-medium">{g.full_name} <span className="text-xs text-faint">· {({ mere: "Mère", pere: "Père", tuteur: "Tuteur" } as Record<string, string>)[g.relationship] ?? "Responsable"}{g.is_primary ? " · contact principal" : ""}</span></p>
                  <p className="mt-0.5 flex flex-wrap gap-x-4 text-xs">
                    {g.phone && <a href={`tel:${g.phone.replace(/\s/g, "")}`} className="underline">📞 {g.phone}</a>}
                    {g.email && <a href={`mailto:${g.email}`} className="underline">✉ {g.email}</a>}
                    {!g.phone && !g.email && <span className="text-faint">Aucun contact</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ===== ONGLETS ===== */}
      <nav aria-label="Sections de la fiche" className="player-tabs -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&>a]:shrink-0 [&>a]:whitespace-nowrap">
        {visibleTabs.map((t) => {
          const active = t.key === activeTab;
          const count = tabCounts[t.key];
          return (
            <Link
              key={t.key}
              href={`/joueurs/${player.id}?tab=${t.key}`}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
              style={{
                background: active ? "var(--brand)" : "var(--surf-2)",
                color: active ? "#fff" : "var(--text-dim)",
                border: `1px solid ${active ? "var(--brand)" : "var(--border)"}`,
              }}
            >
              {t.label}
              {count !== undefined && count > 0 && (
                <span className="ml-2 rounded-full px-1.5 py-0.5 text-[10px]" style={{ background: active ? "rgba(255,255,255,0.22)" : "var(--surf)", color: active ? "#fff" : "var(--text-faint)" }}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ===== VUE D'ENSEMBLE ===== */}
      {activeTab === "apercu" && (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {EVAL_TYPES.map((t) => (
                <IndexTile
                  key={t}
                  label={EVAL_LABELS[t]}
                  value={avgs[t]}
                  delta={trend(ev, t)}
                  count={ev.filter((e) => e.evaluation_type === t).length}
                  color={EVAL_COLORS[t]}
                  href={`/joueurs/${player.id}?tab=evaluations&type=${t}`}
                />
              ))}
              <div className="rounded-xl p-4" style={{ background: "var(--surf)", border: "1px solid var(--border)", borderTop: "3px solid var(--green)" }}>
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
                  Présence
                </p>
                <p className="display mt-1 text-4xl font-bold leading-none" style={{ color: attendanceRate !== null && attendanceRate < 70 ? "var(--amber)" : "var(--green)" }}>
                  {attendanceRate !== null ? `${attendanceRate}%` : "—"}
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surf-2)" }}>
                  <div className="h-full rounded-full" style={{ width: `${attendanceRate ?? 0}%`, background: "var(--green)" }} />
                </div>
                <p className="mt-2 text-[11px]" style={{ color: "var(--text-faint)" }}>
                  {attendancePresent} / {attendanceTotal} entraînements
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ background: "var(--surf)", border: "1px solid var(--border)", borderTop: "3px solid var(--brand)" }}>
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
                  Objectifs
                </p>
                <p className="display mt-1 text-4xl font-bold leading-none">
                  {goalsAchieved}
                  <span className="ml-1 text-sm font-medium" style={{ color: "var(--text-faint)" }}>
                    / {goalList.length} atteints
                  </span>
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surf-2)" }}>
                  <div className="h-full rounded-full" style={{ width: `${goalList.length ? (goalsAchieved / goalList.length) * 100 : 0}%`, background: "var(--brand)" }} />
                </div>
                <p className="mt-2 text-[11px]" style={{ color: "var(--text-faint)" }}>
                  {goalsInProgress.length} en cours ou à commencer
                </p>
              </div>
            </div>

            <div className="card">
              <SectionTitle hint="Moyenne par rubrique sur les 3 derniers mois, comparée aux 3 mois précédents.">Profil du joueur</SectionTitle>
              <div className="grid items-center gap-6 lg:grid-cols-2">
                {ev.length > 0 ? (
                  <PlayerRadar data={radarData} accent={settings.brand_color} hasPrevious={previousEv.length > 0} />
                ) : (
                  <p className="text-sm" style={{ color: "var(--text-faint)" }}>
                    Aucune évaluation pour l&apos;instant : ajoute-en une pour voir le profil du joueur.
                  </p>
                )}
                <div className="space-y-4">
                  <div className="rounded-xl p-4" style={{ background: tint("#22c55e", 10), border: `1px solid ${tint("#22c55e", 35)}` }}>
                    <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--green)" }}>
                      Points forts
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm">{devPlan?.strengths || "Non renseignés."}</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: tint("#f59e0b", 10), border: `1px solid ${tint("#f59e0b", 35)}` }}>
                    <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--amber)" }}>
                      Axes d&apos;amélioration
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm">{devPlan?.weaknesses || "Non renseignés."}</p>
                  </div>
                  <Link href={`/joueurs/${player.id}?tab=objectifs`} className="text-xs font-semibold" style={{ color: "var(--brand)" }}>
                    Modifier le plan de développement →
                  </Link>
                </div>
              </div>
            </div>

            <div className="card">
              <SectionTitle hint="Les objectifs à venir et en cours.">Prochains objectifs</SectionTitle>
              <div className="grid gap-3 md:grid-cols-2">
                {goalsInProgress.slice(0, 4).map((g) => (
                  <GoalCard key={g.id} goal={g} playerId={player.id} />
                ))}
                {goalsInProgress.length === 0 && (
                  <p className="text-sm" style={{ color: "var(--text-faint)" }}>
                    Aucun objectif en cours.
                  </p>
                )}
              </div>
            </div>

            {feedbacks && feedbacks.length > 0 && (
              <div className="card">
                <SectionTitle>Derniers feedbacks</SectionTitle>
                <div className="space-y-2">
                  {feedbacks.slice(0, 2).map((f) => (
                    <div key={f.id} className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surf-2)" }}>
                      <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                        {formatDateFr(f.created_at)}
                      </span>
                      {f.positives && (
                        <p className="mt-1">
                          <span style={{ color: "var(--green)" }}>+ </span>
                          {f.positives}
                        </p>
                      )}
                      {f.improvements && (
                        <p>
                          <span style={{ color: "var(--amber)" }}>→ </span>
                          {f.improvements}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="card h-fit">
            <SectionTitle hint="Les moments clés du parcours, du plus récent au plus ancien.">Timeline</SectionTitle>
            <ol className="relative space-y-5 pl-5" style={{ borderLeft: "1px solid var(--border)" }}>
              {timeline.slice(0, 14).map((e, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full" style={{ background: e.color, boxShadow: "0 0 0 3px var(--surf)" }} />
                  <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                    {formatDateFr(e.date)}
                  </p>
                  <p className="text-sm font-semibold">{e.label}</p>
                  {e.detail && (
                    <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                      {e.detail}
                    </p>
                  )}
                </li>
              ))}
              {timeline.length === 0 && (
                <p className="text-sm" style={{ color: "var(--text-faint)" }}>
                  Pas encore d&apos;historique.
                </p>
              )}
            </ol>
            {timeline.length > 14 && (
              <p className="mt-4 text-[11px]" style={{ color: "var(--text-faint)" }}>
                + {timeline.length - 14} événements plus anciens
              </p>
            )}
          </aside>
        </div>
      )}

      {/* ===== ÉVALUATIONS ===== */}
      {activeTab === "evaluations" && (
        <div className="space-y-6">
          <PlayerEvaluations key={initialType} playerId={player.id} evaluatorNames={evaluatorNames} canEdit={["admin", "directeur_sportif"].includes(profile.role)} initialType={initialType} evaluations={ev} attendanceRate={attendanceRate} attendancePresent={attendancePresent} attendanceTotal={attendanceTotal} />
          <section id="nouvelle-evaluation" className="card scroll-mt-4">
            <SectionTitle hint="Choisis une rubrique, une compétence et une note sur 10.">Nouvelle évaluation</SectionTitle>
            <EvaluationForm skills={skills ?? []} action={addEvaluation.bind(null, player.id)} />
          </section>
        </div>
      )}

      {/* ===== OBJECTIFS & PLAN ===== */}
      {activeTab === "objectifs" && (
        <div className="space-y-6">
          <section className="card">
            <SectionTitle hint="Points forts et axes de travail du joueur.">Plan de développement</SectionTitle>
            <DevelopmentPlanForm
              playerId={player.id}
              initialStrengths={devPlan?.strengths ?? ""}
              initialWeaknesses={devPlan?.weaknesses ?? ""}
              action={updateDevelopmentPlan}
            />
          </section>

          <section className="card">
            <SectionTitle hint="L'avancement suit le statut : à commencer → en cours → partiellement atteint → atteint.">Objectifs individuels</SectionTitle>
            <div className="grid gap-3 md:grid-cols-2">
              {goalList.map((g) => (
                <GoalCard key={g.id} goal={g} playerId={player.id} editable />
              ))}
              {goalList.length === 0 && (
                <p className="text-sm" style={{ color: "var(--text-faint)" }}>
                  Aucun objectif défini.
                </p>
              )}
            </div>

            <details id="nouvel-objectif" className="mt-6 rounded-xl p-4" style={{ background: "var(--surf-2)", border: "1px solid var(--border)" }} open={false}>
              <summary className="cursor-pointer text-sm font-semibold">+ Ajouter un objectif</summary>
              <form action={addGoal.bind(null, player.id)} className="mt-4 grid gap-3 sm:grid-cols-2">
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
                <button className="btn-primary sm:col-span-2" type="submit">
                  Ajouter l&apos;objectif
                </button>
              </form>
            </details>
          </section>
        </div>
      )}

      {/* ===== PHYSIQUE ===== */}
      {activeTab === "physique" && (
        <section className="card">
          <SectionTitle hint="Tests physiques (sprint, détente, agilité, endurance...) et suivi de la progression.">Préparation physique</SectionTitle>
          <h3 className="mb-2 mt-1 text-sm font-semibold">Croissance : taille, poids, envergure</h3>
          <MeasurementsHistory playerId={player.id} measurements={measurements ?? []} canEdit={staffView} />
          <h3 className="mb-2 mt-6 text-sm font-semibold">Tests physiques</h3>
          <PhysicalTests playerId={player.id} tests={physicalTests ?? []} addAction={addPhysicalTest} deleteAction={deletePhysicalTest} />
        </section>
      )}

      {/* ===== SUIVI ===== */}
      {activeTab === "suivi" && (
        <div className="space-y-6">
          <section className="card">
            <SectionTitle hint="Feedbacks reçus suite aux entraînements (à ajouter depuis la fiche de la séance).">Feedback</SectionTitle>
            <div className="space-y-2">
              {feedbacks?.map((f) => (
                <div key={f.id} className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surf-2)" }}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                      {formatDateFr(f.created_at)}
                    </span>
                    {f.priority && <span className="badge">Priorité {f.priority}</span>}
                  </div>
                  {f.positives && (
                    <p className="mt-1">
                      <span style={{ color: "var(--green)" }}>+ </span>
                      {f.positives}
                    </p>
                  )}
                  {f.improvements && (
                    <p>
                      <span style={{ color: "var(--amber)" }}>→ </span>
                      {f.improvements}
                    </p>
                  )}
                  {f.next_session_goal && (
                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                      Prochaine séance : {f.next_session_goal}
                    </p>
                  )}
                </div>
              ))}
              {(!feedbacks || feedbacks.length === 0) && (
                <p className="text-sm" style={{ color: "var(--text-faint)" }}>
                  Aucun feedback pour l&apos;instant.
                </p>
              )}
            </div>
          </section>

          {canSeeVideos && (
            <section className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <SectionTitle hint="Vidéos de l'exercice filmées à l'entraînement (aussi depuis le feedback d'une séance).">Vidéos</SectionTitle>
                {canManageVideos && (
                  <AddPlayerVideo
                    playerId={player.id}
                    playerName={`${player.first_name} ${player.last_name}`}
                    trainings={trainingOptions}
                  />
                )}
              </div>
              {playerClips.length > 0 ? (
                <PlayerClipList clips={playerClips} canManage={canManageVideos} showTraining />
              ) : (
                <p className="text-sm" style={{ color: "var(--text-faint)" }}>
                  Aucune vidéo pour l&apos;instant.
                </p>
              )}
            </section>
          )}

          <section className="card">
            <SectionTitle hint="À remplir par le joueur lui-même, régulièrement.">Auto-évaluation</SectionTitle>
            <SelfAssessmentForm playerId={player.id} history={selfAssessments ?? []} action={addSelfAssessment} />
          </section>

          <section className="card">
            <SectionTitle hint="Point d'étape avec le joueur, sa famille et le staff : progression, présence, objectifs, compte rendu.">Réunion de suivi</SectionTitle>
            <Meetings playerId={player.id} meetings={meetings ?? []} snapshot={meetingSnapshot} action={addMeeting} />
          </section>
        </div>
      )}

      {/* ===== BLESSURES (accès restreint) ===== */}
      {activeTab === "blessures" && canSeeInjuries && (
        <section className="card">
          <SectionTitle hint="Module sécurisé — accès restreint : administrateur, directeur sportif, préparateur physique.">Blessures</SectionTitle>
          <Injuries playerId={player.id} injuries={injuries ?? []} declareAction={declareInjury} updateAction={updateInjury} deleteAction={deleteInjury} />
        </section>
      )}
    </div>
  );
}
