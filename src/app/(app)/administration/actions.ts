"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const LOGO_BUCKET = "club-assets";

export async function updateLogo(formData: FormData) {
  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) return { error: "Aucun fichier sélectionné." };
  if (!file.type.startsWith("image/")) return { error: "Le fichier doit être une image." };
  if (file.size > 2 * 1024 * 1024) return { error: "Image trop lourde (2 Mo max)." };

  const supabase = await createClient();

  const ext = file.name.split(".").pop() || "png";
  const path = `logo-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("club_settings")
    .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", true);

  if (updateError) return { error: updateError.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function removeLogo() {
  const supabase = await createClient();
  const { error } = await supabase
    .from("club_settings")
    .update({ logo_url: null, updated_at: new Date().toISOString() })
    .eq("id", true);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateBrandColor(formData: FormData) {
  const color = String(formData.get("brand_color") || "");
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return { error: "Couleur invalide." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("club_settings")
    .update({ brand_color: color, updated_at: new Date().toISOString() })
    .eq("id", true);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateBackgroundColor(formData: FormData) {
  const color = String(formData.get("bg_color") || "");
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return { error: "Couleur invalide." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("club_settings")
    .update({ bg_color: color, updated_at: new Date().toISOString() })
    .eq("id", true);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}
