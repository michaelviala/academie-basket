"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { BLOCK_EDIT_ROLES } from "@/lib/blocks";

type Result = { error?: string; success?: boolean };

export async function saveBlock(
  id: string | null,
  input: {
    name: string;
    start_date: string;
    end_date: string;
    planned_sessions: number;
    major_axis: string;
  },
): Promise<Result> {
  const profile = await requireProfile();
  if (!BLOCK_EDIT_ROLES.includes(profile.role))
    return { error: "Réservé à la direction sportive." };
  const name = input.name.trim().slice(0, 80);
  if (!name) return { error: "Le nom du block est requis." };
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(input.start_date) || !iso.test(input.end_date))
    return { error: "Les dates sont invalides." };
  if (input.end_date < input.start_date)
    return { error: "La date de fin doit être après la date de début." };
  const planned = Math.round(Number(input.planned_sessions));
  if (!Number.isFinite(planned) || planned < 0 || planned > 200)
    return { error: "Le nombre de séances est invalide." };

  const supabase = await createClient();
  const fields = {
    name,
    start_date: input.start_date,
    end_date: input.end_date,
    planned_sessions: planned,
    major_axis: input.major_axis.trim().slice(0, 200) || null,
  };
  if (id) {
    const { error } = await supabase.from("season_blocks").update(fields).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data: last } = await supabase
      .from("season_blocks")
      .select("position")
      .order("position", { ascending: false })
      .limit(1);
    const { error } = await supabase
      .from("season_blocks")
      .insert({ ...fields, position: (last?.[0]?.position ?? 0) + 1 });
    if (error) return { error: error.message };
  }
  revalidatePath("/seances");
  return { success: true };
}

export async function deleteBlock(id: string): Promise<Result> {
  const profile = await requireProfile();
  if (!BLOCK_EDIT_ROLES.includes(profile.role))
    return { error: "Réservé à la direction sportive." };
  const supabase = await createClient();
  const { error } = await supabase.from("season_blocks").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/seances");
  return { success: true };
}
