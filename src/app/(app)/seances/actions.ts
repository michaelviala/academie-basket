"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { BLOCK_TYPES, SESSION_EDIT_ROLES, totalMinutes } from "@/lib/sessions";

export type SessionPayload = {
  title: string;
  date: string;
  start_time: string;
  team_id: string;
  gym_id: string;
  coach_id: string;
  intensity: string;
  blocks: {
    name: string;
    block_type: string;
    duration_minutes: number | null;
    comment: string;
    skill_id: string;
  }[];
};

type Result = { error?: string; id?: string };

const BLOCK_VALUES: string[] = BLOCK_TYPES.map((b) => b.value);

function validate(p: SessionPayload): string | null {
  if (!p.title.trim()) return "Donne un titre à la séance.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) return "La date est invalide.";
  if (p.start_time && !/^\d{2}:\d{2}$/.test(p.start_time))
    return "L'heure de début est invalide.";
  if (!p.team_id) return "Choisis la catégorie concernée.";
  if (p.blocks.some((b) => !b.name.trim()))
    return "Chaque bloc doit avoir un titre.";
  if (
    p.blocks.some(
      (b) =>
        b.duration_minutes !== null &&
        (!Number.isFinite(b.duration_minutes) ||
          b.duration_minutes < 0 ||
          b.duration_minutes > 600),
    )
  )
    return "Une durée de bloc est invalide.";
  return null;
}

function blockRows(trainingId: string, blocks: SessionPayload["blocks"]) {
  return blocks.map((b, i) => ({
    training_id: trainingId,
    name: b.name.trim().slice(0, 200),
    block_type: BLOCK_VALUES.includes(b.block_type)
      ? b.block_type
      : "technique",
    duration_minutes:
      b.duration_minutes && b.duration_minutes > 0
        ? Math.round(b.duration_minutes)
        : null,
    comment: b.comment.trim().slice(0, 2000) || null,
    skill_id: b.skill_id || null,
    position: i,
  }));
}

function trainingFields(p: SessionPayload, fallbackCoach: string) {
  const total = totalMinutes(p.blocks);
  return {
    objective: p.title.trim().slice(0, 200),
    date: p.date,
    start_time: p.start_time || null,
    team_id: p.team_id,
    gym_id: p.gym_id || null,
    coach_id: p.coach_id || fallbackCoach,
    intensity: p.intensity || null,
    duration_minutes: total > 0 ? total : null,
  };
}

export async function createSession(p: SessionPayload): Promise<Result> {
  const profile = await requireProfile();
  if (!SESSION_EDIT_ROLES.includes(profile.role))
    return { error: "Action réservée à l'équipe encadrante." };
  const invalid = validate(p);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trainings")
    .insert(trainingFields(p, profile.id))
    .select("id")
    .single();
  if (error || !data)
    return { error: error?.message ?? "Création impossible." };

  if (p.blocks.length > 0) {
    const { error: blocksError } = await supabase
      .from("training_exercises")
      .insert(blockRows(data.id, p.blocks));
    if (blocksError) {
      await supabase.from("trainings").delete().eq("id", data.id);
      return { error: blocksError.message };
    }
  }
  revalidatePath("/seances");
  return { id: data.id };
}

export async function updateSession(
  id: string,
  p: SessionPayload,
): Promise<Result> {
  const profile = await requireProfile();
  if (!SESSION_EDIT_ROLES.includes(profile.role))
    return { error: "Action réservée à l'équipe encadrante." };
  const invalid = validate(p);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { data: old } = await supabase
    .from("training_exercises")
    .select("id")
    .eq("training_id", id);
  const { data: updated, error } = await supabase
    .from("trainings")
    .update({ ...trainingFields(p, profile.id), coach_id: p.coach_id || null })
    .eq("id", id)
    .select("id");
  if (error) return { error: error.message };
  if (!updated || updated.length === 0)
    return { error: "Modification refusée." };

  // nouveaux blocs d'abord, anciens ensuite : rien n'est perdu si l'insertion échoue
  if (p.blocks.length > 0) {
    const { error: blocksError } = await supabase
      .from("training_exercises")
      .insert(blockRows(id, p.blocks));
    if (blocksError) return { error: blocksError.message };
  }
  const oldIds = (old ?? []).map((b) => b.id);
  if (oldIds.length > 0)
    await supabase.from("training_exercises").delete().in("id", oldIds);

  revalidatePath("/seances");
  revalidatePath(`/seances/${id}`);
  return { id };
}

export async function deleteSession(id: string): Promise<Result> {
  const profile = await requireProfile();
  if (!SESSION_EDIT_ROLES.includes(profile.role))
    return { error: "Action réservée à l'équipe encadrante." };
  const supabase = await createClient();
  await supabase.from("training_exercises").delete().eq("training_id", id);
  const { data, error } = await supabase
    .from("trainings")
    .delete()
    .eq("id", id)
    .select("id");
  if (error)
    return {
      error: error.message.includes("foreign key")
        ? "Cette séance a des feedbacks ou des présences : elle ne peut pas être supprimée."
        : error.message,
    };
  if (!data || data.length === 0) return { error: "Suppression refusée." };
  revalidatePath("/seances");
  return {};
}

export async function updateTrainingGym(trainingId: string, gymId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("trainings")
    .update({ gym_id: gymId || null })
    .eq("id", trainingId);
  if (error) return { error: error.message };
  revalidatePath("/seances");
  return { success: true };
}
