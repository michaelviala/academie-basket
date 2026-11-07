import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { getCategoryColors } from "@/lib/technical-guide-data";
import { SESSION_EDIT_ROLES } from "@/lib/sessions";
import { SeancesHeader } from "@/components/seances-tabs";
import {
  SessionsBrowser,
  type SessionCard,
} from "@/components/sessions-browser";

export default async function SeancesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: trainings }, { data: exercises }, colors] = await Promise.all([
    supabase
      .from("trainings")
      .select(
        "id, objective, date, start_time, duration_minutes, intensity, teams(name, category), gyms(name)",
      )
      .order("date", { ascending: false })
      .limit(500),
    supabase
      .from("training_exercises")
      .select("training_id, name, block_type, duration_minutes, position")
      .order("position")
      .limit(5000),
    getCategoryColors(),
  ]);

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
  }));

  return (
    <div className="space-y-6">
      <SeancesHeader
        active="contenu"
        canCreate={SESSION_EDIT_ROLES.includes(profile.role)}
      />
      <SessionsBrowser
        sessions={sessions}
        todayKey={new Date().toISOString().slice(0, 10)}
      />
    </div>
  );
}
