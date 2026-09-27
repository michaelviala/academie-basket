"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { TablesInsert } from "@/types/database";

export async function createPlayer(formData: FormData) {
  const supabase = await createClient();

  const payload: TablesInsert<"players"> = {
    first_name: String(formData.get("first_name") ?? ""),
    last_name: String(formData.get("last_name") ?? ""),
    birth_date: String(formData.get("birth_date") ?? ""),
    height_cm: formData.get("height_cm") ? Number(formData.get("height_cm")) : null,
    weight_kg: formData.get("weight_kg") ? Number(formData.get("weight_kg")) : null,
    wingspan_cm: formData.get("wingspan_cm") ? Number(formData.get("wingspan_cm")) : null,
    dominant_hand: (formData.get("dominant_hand") as TablesInsert<"players">["dominant_hand"]) || null,
    primary_position: (formData.get("primary_position") as string) || null,
    secondary_position: (formData.get("secondary_position") as string) || null,
    jersey_number: formData.get("jersey_number") ? Number(formData.get("jersey_number")) : null,
    team_id: (formData.get("team_id") as string) || null,
    season_id: (formData.get("season_id") as string) || null,
    entry_date: (formData.get("entry_date") as string) || null,
    previous_club: (formData.get("previous_club") as string) || null,
  };

  const { data, error } = await supabase.from("players").insert(payload).select("id").single();

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/joueurs/${data.id}`);
}
