"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { notifyPlayer } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

export async function addBlock(trainingId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Le titre du bloc est requis.");

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("training_exercises")
    .select("position")
    .eq("training_id", trainingId)
    .order("position", { ascending: false })
    .limit(1);
  const nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from("training_exercises").insert({
    training_id: trainingId,
    name,
    block_type: (formData.get("block_type") as string) || "technique",
    duration_minutes: formData.get("duration_minutes") ? Number(formData.get("duration_minutes")) : null,
    comment: (formData.get("comment") as string) || null,
    skill_id: (formData.get("skill_id") as string) || null,
    position: nextPosition,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/entrainements/${trainingId}`);
}

export async function deleteBlock(trainingId: string, blockId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("training_exercises").delete().eq("id", blockId);
  if (error) return { error: error.message };
  revalidatePath(`/entrainements/${trainingId}`);
  return { success: true };
}

export async function upsertFeedback(trainingId: string, playerId: string, formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const positives = (formData.get("positives") as string) || null;
  const improvements = (formData.get("improvements") as string) || null;
  const priority = (formData.get("priority") as string) || null;
  const next_session_goal = (formData.get("next_session_goal") as string) || null;

  if (!positives && !improvements && !priority && !next_session_goal) {
    throw new Error("Renseigne au moins un champ du feedback.");
  }

  const { error } = await supabase.from("feedbacks").insert({
    training_id: trainingId,
    player_id: playerId,
    positives,
    improvements,
    priority,
    next_session_goal,
    author_id: profile.id,
    is_player_feedback: false,
  });

  if (error) throw new Error(error.message);

  await notifyPlayer(playerId, "feedback", "Nouveau feedback ajouté suite à un entraînement.");

  revalidatePath(`/entrainements/${trainingId}`);
}

export async function deleteFeedback(trainingId: string, feedbackId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("feedbacks").delete().eq("id", feedbackId);
  if (error) return { error: error.message };
  revalidatePath(`/entrainements/${trainingId}`);
  return { success: true };
}

export async function moveBlock(trainingId: string, blockId: string, direction: "up" | "down") {
  const supabase = await createClient();

  const { data: blocks } = await supabase
    .from("training_exercises")
    .select("id, position")
    .eq("training_id", trainingId)
    .order("position", { ascending: true });

  if (!blocks) return { error: "Séance introuvable." };

  const index = blocks.findIndex((b) => b.id === blockId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= blocks.length) return { success: true };

  const current = blocks[index];
  const swap = blocks[swapIndex];

  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from("training_exercises").update({ position: swap.position }).eq("id", current.id),
    supabase.from("training_exercises").update({ position: current.position }).eq("id", swap.id),
  ]);

  if (e1 || e2) return { error: (e1 || e2)?.message };
  revalidatePath(`/entrainements/${trainingId}`);
  return { success: true };
}
