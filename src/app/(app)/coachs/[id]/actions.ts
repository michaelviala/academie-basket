"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateCoachContact(coachId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      phone: (formData.get("phone") as string) || null,
      address: (formData.get("address") as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", coachId);

  if (error) throw new Error(error.message);
  revalidatePath(`/coachs/${coachId}`);
}

const PHOTO_BUCKET = "coach-photos";

export async function uploadCoachPhoto(coachId: string, formData: FormData) {
  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) return { error: "Aucun fichier sélectionné." };
  if (!file.type.startsWith("image/")) return { error: "Le fichier doit être une image." };
  if (file.size > 3 * 1024 * 1024) return { error: "Image trop lourde (3 Mo max)." };

  const supabase = await createClient();

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${coachId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", coachId);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/coachs/${coachId}`);
  revalidatePath("/coachs");
  return { success: true, url: publicUrl };
}

export async function removeCoachPhoto(coachId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", coachId);
  if (error) return { error: error.message };
  revalidatePath(`/coachs/${coachId}`);
  revalidatePath("/coachs");
  return { success: true };
}

export async function assignTeam(coachId: string, formData: FormData) {
  const teamId = String(formData.get("team_id") ?? "");
  if (!teamId) throw new Error("Équipe requise.");

  const supabase = await createClient();
  const { error } = await supabase.from("team_coaches").insert({ coach_id: coachId, team_id: teamId });
  if (error) throw new Error(error.message);
  revalidatePath(`/coachs/${coachId}`);
}

export async function unassignTeam(coachId: string, teamId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("team_coaches")
    .delete()
    .eq("coach_id", coachId)
    .eq("team_id", teamId);
  if (error) return { error: error.message };
  revalidatePath(`/coachs/${coachId}`);
  return { success: true };
}
