"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { notifyStaffRoles } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

const INJURY_ACTIVE_STATUSES = ["en_cours", "en_reprise"];

async function syncPlayerInjuryStatus(playerId: string) {
  const supabase = await createClient();

  const [{ data: active }, { data: player }] = await Promise.all([
    supabase.from("injuries").select("id").eq("player_id", playerId).in("status", INJURY_ACTIVE_STATUSES).limit(1),
    supabase.from("players").select("status").eq("id", playerId).maybeSingle(),
  ]);

  if (active && active.length > 0) {
    if (player?.status !== "blesse") {
      await supabase.from("players").update({ status: "blesse" }).eq("id", playerId);
    }
  } else if (player?.status === "blesse") {
    await supabase.from("players").update({ status: "actif" }).eq("id", playerId);
  }
}

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

export async function updateDevelopmentPlan(playerId: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("development_plans").upsert(
    {
      player_id: playerId,
      strengths: (formData.get("strengths") as string) || null,
      weaknesses: (formData.get("weaknesses") as string) || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "player_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath(`/joueurs/${playerId}`);
}

export async function addSelfAssessment(playerId: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("self_assessments").insert({
    player_id: playerId,
    strongest_skill: (formData.get("strongest_skill") as string) || null,
    skill_to_improve: (formData.get("skill_to_improve") as string) || null,
    confidence_score: formData.get("confidence_score") ? Number(formData.get("confidence_score")) : null,
    engagement_score: formData.get("engagement_score") ? Number(formData.get("engagement_score")) : null,
    next_objective: (formData.get("next_objective") as string) || null,
    useful_exercises: (formData.get("useful_exercises") as string) || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/joueurs/${playerId}`);
}

export async function addPhysicalTest(playerId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("physical_tests").insert({
    player_id: playerId,
    test_type: String(formData.get("test_type") ?? ""),
    result: Number(formData.get("result")),
    unit: String(formData.get("unit") ?? ""),
    test_date: (formData.get("test_date") as string) || new Date().toISOString().slice(0, 10),
    comment: (formData.get("comment") as string) || null,
    evaluator_id: user?.id ?? null,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/joueurs/${playerId}`);
}

export async function deletePhysicalTest(playerId: string, testId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("physical_tests").delete().eq("id", testId);
  if (error) return { error: error.message };
  revalidatePath(`/joueurs/${playerId}`);
  return { success: true };
}

export async function declareInjury(playerId: string, formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from("injuries").insert({
    player_id: playerId,
    injury_type: String(formData.get("injury_type") ?? ""),
    zone: (formData.get("zone") as string) || null,
    start_date: (formData.get("start_date") as string) || new Date().toISOString().slice(0, 10),
    estimated_duration: (formData.get("estimated_duration") as string) || null,
    restrictions: (formData.get("restrictions") as string) || null,
    return_protocol: (formData.get("return_protocol") as string) || null,
    expected_return_date: (formData.get("expected_return_date") as string) || null,
    comment: (formData.get("comment") as string) || null,
    status: "en_cours",
    created_by: profile.id,
  });

  if (error) throw new Error(error.message);
  await syncPlayerInjuryStatus(playerId);

  await notifyStaffRoles(
    ["admin", "directeur_sportif", "preparateur_physique"],
    "injury",
    "Blessure déclarée pour un joueur.",
    playerId
  );

  revalidatePath(`/joueurs/${playerId}`);
  revalidatePath("/dashboard");
}

export async function updateInjury(playerId: string, injuryId: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("injuries")
    .update({
      status: String(formData.get("status") ?? "en_cours"),
      restrictions: (formData.get("restrictions") as string) || null,
      return_protocol: (formData.get("return_protocol") as string) || null,
      expected_return_date: (formData.get("expected_return_date") as string) || null,
      comment: (formData.get("comment") as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", injuryId);

  if (error) throw new Error(error.message);
  await syncPlayerInjuryStatus(playerId);
  revalidatePath(`/joueurs/${playerId}`);
  revalidatePath("/dashboard");
}

export async function deleteInjury(playerId: string, injuryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("injuries").delete().eq("id", injuryId);
  if (error) return { error: error.message };
  await syncPlayerInjuryStatus(playerId);
  revalidatePath(`/joueurs/${playerId}`);
  revalidatePath("/dashboard");
  return { success: true };
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
