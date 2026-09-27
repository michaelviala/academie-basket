"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Enums } from "@/types/database";

export async function createMatch(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("matches").insert({
    opponent: String(formData.get("opponent") ?? ""),
    date: String(formData.get("date") ?? ""),
    competition: (formData.get("competition") as string) || null,
    home_away: (formData.get("home_away") as Enums<"home_away">) || "domicile",
    team_id: (formData.get("team_id") as string) || null,
    score_us: formData.get("score_us") ? Number(formData.get("score_us")) : null,
    score_them: formData.get("score_them") ? Number(formData.get("score_them")) : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/matchs");
}
