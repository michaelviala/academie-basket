"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { notifyPlayer } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

export async function addVideo(formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const videoUrl = String(formData.get("video_url") ?? "").trim();
  if (!title) throw new Error("Le titre est requis.");
  if (!videoUrl) throw new Error("Le lien de la vidéo est requis.");

  const playerId = (formData.get("player_id") as string) || null;

  const { error } = await supabase.from("videos").insert({
    title,
    video_url: videoUrl,
    player_id: playerId,
    training_id: (formData.get("training_id") as string) || null,
    skill_category: (formData.get("skill_category") as string) || null,
    duration_seconds: formData.get("duration_seconds") ? Number(formData.get("duration_seconds")) : null,
    comment: (formData.get("comment") as string) || null,
    created_by: profile.id,
  });

  if (error) throw new Error(error.message);

  if (playerId) {
    await notifyPlayer(playerId, "video", `Nouvelle vidéo ajoutée : « ${title} »`);
  }

  revalidatePath("/videos");
}

export async function deleteVideo(videoId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("videos").delete().eq("id", videoId);
  if (error) return { error: error.message };
  revalidatePath("/videos");
  return { success: true };
}
