import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { formatDateLong } from "@/lib/sessions";
import { SessionBlocks } from "@/components/session-blocks";
import { TrainingFeedback } from "@/components/training-feedback";

export default async function SeancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: training } = await supabase
    .from("trainings")
    .select("*, teams(name, category), gyms(name)")
    .eq("id", id)
    .maybeSingle();

  if (!training) notFound();

  const [{ data: blocks }, { data: players }, { data: feedbacks }] =
    await Promise.all([
      supabase
        .from("training_exercises")
        .select("*, skills(name)")
        .eq("training_id", id)
        .order("position", { ascending: true }),
      training.team_id
        ? supabase
            .from("players")
            .select("id, first_name, last_name, photo_url")
            .eq("team_id", training.team_id)
            .order("last_name")
        : Promise.resolve({ data: [] as never[] }),
      supabase
        .from("feedbacks")
        .select(
          "id, player_id, positives, improvements, priority, next_session_goal, created_at",
        )
        .eq("training_id", id)
        .order("created_at", { ascending: false }),
    ]);

  type FeedbackRow = NonNullable<typeof feedbacks>[number];
  const feedbacksByPlayer: Record<string, FeedbackRow[]> = {};
  for (const f of feedbacks ?? []) {
    (feedbacksByPlayer[f.player_id] ??= []).push(f);
  }

  const canManage = ["admin", "directeur_sportif", "coach"].includes(
    profile.role,
  );

  return (
    <div className="space-y-6">
      <Link
        href="/seances"
        className="text-xs"
        style={{ color: "var(--text-faint)" }}
      >
        ← Retour aux séances
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--brand)" }}
          >
            Séance · {formatDateLong(training.date)}
            {training.start_time ? ` · ${training.start_time.slice(0, 5)}` : ""}
          </p>
          <h1 className="display mt-1 text-3xl font-bold">
            {training.objective ?? "Séance d'entraînement"}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="badge">
              {training.teams?.name ?? "Équipe non définie"}
            </span>
            {training.gyms?.name && (
              <span className="badge">{training.gyms.name}</span>
            )}
            {training.intensity && (
              <span className="badge">Intensité {training.intensity}</span>
            )}
          </div>
        </div>
        {canManage && (
          <Link
            href={`/seances/${training.id}/modifier`}
            className="btn-primary"
          >
            Modifier la séance
          </Link>
        )}
      </div>

      <div className="card">
        <SessionBlocks
          trainingId={training.id}
          startTime={training.start_time}
          blocks={blocks ?? []}
          canManage={false}
        />
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Feedback joueurs</h2>
        <TrainingFeedback
          trainingId={training.id}
          players={players ?? []}
          feedbacksByPlayer={feedbacksByPlayer}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
