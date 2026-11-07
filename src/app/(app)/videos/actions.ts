"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { parseTags, parseTimecode } from "@/lib/library";
import { VIDEO_EDIT_ROLES } from "@/lib/videos";

type Result = { error?: string; success?: boolean };

async function guard() {
  const profile = await requireProfile();
  if (!VIDEO_EDIT_ROLES.includes(profile.role))
    return { profile, error: "Action réservée à l'équipe encadrante." };
  return { profile, error: null };
}

function readClip(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const start = parseTimecode(String(formData.get("start") ?? "")) ?? 0;
  const end = parseTimecode(String(formData.get("end") ?? ""));
  if (!title) return { error: "Le titre est requis." as const };
  if (end !== null && end <= start)
    return { error: "La fin du clip doit être après le début." as const };
  return {
    value: {
      title,
      start_seconds: start,
      end_seconds: end,
      note: String(formData.get("note") ?? "").trim().slice(0, 1000) || null,
      tags: parseTags(String(formData.get("tags") ?? "")),
      player_id: String(formData.get("player_id") ?? "") || null,
    },
  };
}

export async function createClip(formData: FormData): Promise<Result> {
  const { profile, error } = await guard();
  if (error) return { error };
  const sourceId = String(formData.get("source_id") ?? "");
  if (!sourceId) return { error: "Choisis une vidéo source." };
  const parsed = readClip(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("video_clips")
    .insert({ ...parsed.value, source_id: sourceId, created_by: profile.id });
  if (dbError) return { error: dbError.message };
  revalidatePath("/videos");
  return { success: true };
}

export async function updateClip(
  clipId: string,
  formData: FormData,
): Promise<Result> {
  const { error } = await guard();
  if (error) return { error };
  const parsed = readClip(formData);
  if ("error" in parsed) return { error: parsed.error };
  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("video_clips")
    .update(parsed.value)
    .eq("id", clipId);
  if (dbError) return { error: dbError.message };
  revalidatePath("/videos");
  return { success: true };
}

export async function deleteClip(clipId: string): Promise<Result> {
  const { error } = await guard();
  if (error) return { error };
  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("video_clips")
    .delete()
    .eq("id", clipId);
  if (dbError) return { error: dbError.message };
  revalidatePath("/videos");
  return { success: true };
}

export async function createMontage(formData: FormData) {
  const { profile, error } = await guard();
  if (error) throw new Error(error);
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  if (!title) throw new Error("Le titre est requis.");
  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("montages")
    .insert({ title, created_by: profile.id })
    .select("id")
    .single();
  if (dbError) throw new Error(dbError.message);
  revalidatePath("/videos");
  redirect(`/videos?montage=${data.id}`);
}

export async function saveMontage(
  montageId: string,
  input: { title: string; description: string; clipIds: string[] },
): Promise<Result> {
  const { error } = await guard();
  if (error) return { error };
  const title = input.title.trim().slice(0, 200);
  if (!title) return { error: "Le titre est requis." };

  const supabase = await createClient();
  const { error: upErr } = await supabase
    .from("montages")
    .update({
      title,
      description: input.description.trim().slice(0, 1000) || null,
    })
    .eq("id", montageId);
  if (upErr) return { error: upErr.message };

  // Remplace la liste ordonnée : on insère la nouvelle avant de supprimer l'ancienne.
  const { data: old } = await supabase
    .from("montage_clips")
    .select("id")
    .eq("montage_id", montageId);
  if (input.clipIds.length > 0) {
    const { error: insErr } = await supabase.from("montage_clips").insert(
      input.clipIds.map((clip_id, position) => ({
        montage_id: montageId,
        clip_id,
        position,
      })),
    );
    if (insErr) return { error: insErr.message };
  }
  const oldIds = (old ?? []).map((r) => r.id);
  if (oldIds.length > 0)
    await supabase.from("montage_clips").delete().in("id", oldIds);

  revalidatePath("/videos");
  return { success: true };
}

export async function deleteMontage(montageId: string) {
  const { error } = await guard();
  if (error) throw new Error(error);
  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("montages")
    .delete()
    .eq("id", montageId);
  if (dbError) throw new Error(dbError.message);
  revalidatePath("/videos");
  redirect("/videos?vue=montages");
}
