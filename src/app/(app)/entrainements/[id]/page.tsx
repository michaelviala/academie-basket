import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { SessionBlocks } from "@/components/session-blocks";
import { TrainingFeedback } from "@/components/training-feedback";
import { addBlock } from "./actions";

const BLOCK_TYPES = [
  { value: "echauffement", label: "Échauffement" },
  { value: "technique", label: "Technique" },
  { value: "tactique", label: "Tactique" },
  { value: "physique", label: "Physique" },
  { value: "opposition", label: "Opposition" },
  { value: "retour_au_calme", label: "Retour au calme" },
];

export default async function SeancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: training } = await supabase
    .from("trainings")
    .select("*, teams(name, category), gyms(name)")
    .eq("id", id)
    .maybeSingle();

  if (!training) notFound();

  const [{ data: blocks }, { data: skills }, { data: players }, { data: feedbacks }] = await Promise.all([
    supabase
      .from("training_exercises")
      .select("*, skills(name)")
      .eq("training_id", id)
      .order("position", { ascending: true }),
    supabase.from("skills").select("id, category, name").order("category"),
    training.team_id
      ? supabase
          .from("players")
          .select("id, first_name, last_name, photo_url")
          .eq("team_id", training.team_id)
          .order("last_name")
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("feedbacks")
      .select("id, player_id, positives, improvements, priority, next_session_goal, created_at")
      .eq("training_id", id)
      .order("created_at", { ascending: false }),
  ]);

  type FeedbackRow = NonNullable<typeof feedbacks>[number];
  const feedbacksByPlayer: Record<string, FeedbackRow[]> = {};
  for (const f of feedbacks ?? []) {
    (feedbacksByPlayer[f.player_id] ??= []).push(f);
  }

  const canManage = ["admin", "directeur_sportif", "coach"].includes(profile.role);

  return (
    <div className="space-y-6">
      <Link href="/entrainements" className="text-xs" style={{ color: "var(--text-faint)" }}>
        ← Retour aux entraînements
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--brand)" }}>
            Séance · {training.date}{training.start_time ? ` · ${training.start_time}` : ""}
          </p>
          <h1 className="display mt-1 text-3xl font-bold">{training.objective ?? "Séance d'entraînement"}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="badge">{training.teams?.name ?? "Équipe non définie"}</span>
            {training.gyms?.name && <span className="badge">{training.gyms.name}</span>}
            {training.intensity && <span className="badge">Intensité {training.intensity}</span>}
          </div>
        </div>
      </div>

      <div className="card">
        <SessionBlocks
          trainingId={training.id}
          startTime={training.start_time}
          blocks={blocks ?? []}
          canManage={canManage}
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

      {canManage && (
        <div className="card">
          <h2 className="mb-3 font-semibold">Ajouter un bloc</h2>
          <form action={addBlock.bind(null, training.id)} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <input className="input col-span-2 sm:col-span-2" name="name" placeholder="Titre du bloc" required />
            <select className="input" name="block_type" defaultValue="technique">
              {BLOCK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <input className="input" type="number" name="duration_minutes" placeholder="Durée (min)" min={1} />
            <select className="input col-span-2 sm:col-span-4" name="skill_id" defaultValue="">
              <option value="">Compétence liée (optionnel)</option>
              {skills?.map((s) => (
                <option key={s.id} value={s.id}>[{s.category}] {s.name}</option>
              ))}
            </select>
            <textarea className="input col-span-2 sm:col-span-4" name="comment" placeholder="Description / consignes" rows={2} />
            <button className="btn-primary col-span-2 sm:col-span-4" type="submit">+ Ajouter le bloc</button>
          </form>
        </div>
      )}
    </div>
  );
}
