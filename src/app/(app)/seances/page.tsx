import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { getCategoryColors } from "@/lib/technical-guide-data";
import { SESSION_EDIT_ROLES } from "@/lib/sessions";
import { BLOCK_EDIT_ROLES } from "@/lib/blocks";
import { SeancesHeader } from "@/components/seances-tabs";
import {
  SessionsBrowser,
  type SessionCard,
} from "@/components/sessions-browser";

export default async function SeancesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: trainings }, { data: exercises }, colors, { data: blocks }, { data: coachRows }] = await Promise.all([
    supabase
      .from("trainings")
      .select(
        "id, objective, date, start_time, duration_minutes, intensity, focus, coach_id, teams(name, category), gyms(name)",
      )
      .order("date", { ascending: false })
      .limit(500),
    supabase
      .from("training_exercises")
      .select("training_id, name, block_type, duration_minutes, position")
      .order("position")
      .limit(5000),
    getCategoryColors(),
    supabase.from("season_blocks").select("*").order("start_date"),
    supabase.from("profiles").select("id, full_name").in("role", ["coach", "directeur_sportif", "preparateur_physique", "admin"]),
  ]);
  const coachName = new Map((coachRows ?? []).map((c) => [c.id, c.full_name]));

  const blocksBy = new Map<string, SessionCard["blocks"]>();
  exercises?.forEach((e) =>
    blocksBy.set(e.training_id, [
      ...(blocksBy.get(e.training_id) ?? []),
      { type: e.block_type, minutes: e.duration_minutes, name: e.name },
    ]),
  );

  const sessions: SessionCard[] = (trainings ?? []).map((t) => ({
    id: t.id,
    title: t.objective?.trim() || "Séance d'entraînement",
    date: t.date,
    start_time: t.start_time,
    duration: t.duration_minutes,
    teamName: t.teams?.name ?? null,
    category: t.teams?.category ?? null,
    color: (t.teams?.category && colors[t.teams.category]) || "var(--brand)",
    gym: t.gyms?.name ?? null,
    intensity: t.intensity,
    blocks: blocksBy.get(t.id) ?? [],
    focus: t.focus,
    coachName: t.coach_id ? (coachName.get(t.coach_id) ?? null) : null,
  }));

  return (
    <div className="space-y-6">
      <SeancesHeader
        active="contenu"
        canCreate={SESSION_EDIT_ROLES.includes(profile.role)}
      />
      <SessionsBrowser
        sessions={sessions}
        seasonBlocks={blocks ?? []}
        canManageBlocks={BLOCK_EDIT_ROLES.includes(profile.role)}
        canCreate={SESSION_EDIT_ROLES.includes(profile.role)}
        todayKey={new Date().toISOString().slice(0, 10)}
      />
    </div>
  );
}
