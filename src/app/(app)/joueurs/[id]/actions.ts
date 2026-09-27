"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addEvaluation(playerId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("evaluations").insert({
    player_id: playerId,
    skill_id: (formData.get("skill_id") as string) || null,
    evaluation_type: formData.get("evaluation_type") as
      | "technique"
      | "tactique"
      | "physique"
      | "mental",
    score: Number(formData.get("score")),
    comment: (formData.get("comment") as string) || null,
    evaluator_id: user?.id ?? null,
    evaluated_at: (formData.get("evaluated_at") as string) || new Date().toISOString().slice(0, 10),
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/joueurs/${playerId}`);
}

const PHOTO_BUCKET = "player-photos";

export async function uploadPlayerPhoto(playerId: string, formData: FormData) {
  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) return { error: "Aucun fichier sélectionné." };
  if (!file.type.startsWith("image/")) return { error: "Le fichier doit être une image." };
  if (file.size > 3 * 1024 * 1024) return { error: "Image trop lourde (3 Mo max)." };

  const supabase = await createClient();

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${playerId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("players")
    .update({ photo_url: publicUrl })
    .eq("id", playerId);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/joueurs/${playerId}`);
  revalidatePath("/joueurs");
  return { success: true, url: publicUrl };
}

export async function removePlayerPhoto(playerId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("players").update({ photo_url: null }).eq("id", playerId);
  if (error) return { error: error.message };
  revalidatePath(`/joueurs/${playerId}`);
  revalidatePath("/joueurs");
  return { success: true };
}

export async function addGoal(playerId: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("goals").insert({
    player_id: playerId,
    title: String(formData.get("title") ?? ""),
    category: (formData.get("category") as string) || null,
    description: (formData.get("description") as string) || null,
    initial_level: (formData.get("initial_level") as string) || null,
    target_level: (formData.get("target_level") as string) || null,
    due_date: (formData.get("due_date") as string) || null,
    priority: (formData.get("priority") as string) || null,
    planned_actions: (formData.get("planned_actions") as string) || null,
    success_indicator: (formData.get("success_indicator") as string) || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/joueurs/${playerId}`);
}

export async function updateGoalStatus(formData: FormData) {
  const supabase = await createClient();
  const goalId = String(formData.get("goal_id"));
  const playerId = String(formData.get("player_id"));
  const status = String(formData.get("status")) as import("@/types/database").Enums<"goal_status">;

  const { error } = await supabase.from("goals").update({ status }).eq("id", goalId);
  if (error) throw new Error(error.message);
  revalidatePath(`/joueurs/${playerId}`);
}
