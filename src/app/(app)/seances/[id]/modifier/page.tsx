import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { getSessionFormData } from "@/lib/sessions-data";
import { SESSION_EDIT_ROLES, formatDateLong } from "@/lib/sessions";
import { SessionEditor } from "@/components/session-editor";

export default async function ModifierSeancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  if (!SESSION_EDIT_ROLES.includes(profile.role)) redirect(`/seances/${id}`);
  const supabase = await createClient();

  const { data: training } = await supabase
    .from("trainings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!training) notFound();

  const [{ data: blocks }, form] = await Promise.all([
    supabase
      .from("training_exercises")
      .select("name, block_type, duration_minutes, comment, skill_id, system_id")
      .eq("training_id", id)
      .order("position"),
    getSessionFormData(),
  ]);

  return (
    <div className="space-y-5">
      <Link
        href={`/seances/${id}`}
        className="text-xs"
        style={{ color: "var(--text-faint)" }}
      >
        ← Retour à la séance
      </Link>
      <div>
        <p
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--brand)" }}
        >
          Séances · {formatDateLong(training.date)}
        </p>
        <h1 className="display mt-1 text-4xl font-bold uppercase">
          Modifier la séance
        </h1>
      </div>
      <SessionEditor
        sessionId={id}
        initial={{
          title: training.objective ?? "",
          date: training.date,
          start_time: training.start_time?.slice(0, 5) ?? "",
          team_id: training.team_id ?? "",
          gym_id: training.gym_id ?? "",
          coach_id: training.coach_id ?? "",
          intensity: training.intensity ?? "",
          focus: training.focus ?? "",
          blocks: (blocks ?? []).map((b) => ({
            name: b.name,
            block_type: b.block_type,
            duration_minutes: b.duration_minutes,
            comment: b.comment ?? "",
            skill_id: b.skill_id ?? "",
            system_id: b.system_id ?? "",
          })),
        }}
        teams={form.teams.map((t) => ({ id: t.id, name: t.name }))}
        gyms={form.gyms.map((g) => ({ id: g.id, name: g.name }))}
        coaches={form.coaches}
        skills={form.skills}
        systems={form.systems}
      />
    </div>
  );
}
