"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTeam(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    season_id: String(formData.get("season_id") ?? ""),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/equipes");
}

export async function createSeason(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("seasons").insert({
    label: String(formData.get("label") ?? ""),
    start_date: String(formData.get("start_date") ?? ""),
    end_date: String(formData.get("end_date") ?? ""),
    is_active: formData.get("is_active") === "on",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/equipes");
  revalidatePath("/administration");
}
