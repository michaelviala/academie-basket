"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTraining(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("trainings").insert({
    date: String(formData.get("date") ?? ""),
    start_time: (formData.get("start_time") as string) || null,
    team_id: (formData.get("team_id") as string) || null,
    coach_id: user?.id ?? null,
    duration_minutes: formData.get("duration_minutes") ? Number(formData.get("duration_minutes")) : null,
    objective: (formData.get("objective") as string) || null,
    intensity: (formData.get("intensity") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/entrainements");
}
