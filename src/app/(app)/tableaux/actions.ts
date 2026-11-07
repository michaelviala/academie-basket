"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { WB_EDIT_ROLES, emptyPage, parsePages, type Court, type Theme } from "@/lib/whiteboard";

export async function createWhiteboard(input: { title: string; court: Court }): Promise<{ id?: string; error?: string }> {
  const profile = await requireProfile();
  if (!WB_EDIT_ROLES.includes(profile.role)) return { error: "Action réservée à l'équipe d'entraîneurs." };
  const title = input.title.trim().slice(0, 200);
  if (!title) return { error: "Donne un titre au tableau." };
  const court: Court = input.court === "full" ? "full" : "half";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("whiteboards")
    .insert({ title, court, pages: [emptyPage()], created_by: profile.id })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Création impossible." };
  revalidatePath("/tableaux");
  return { id: data.id };
}

export type WhiteboardInput = {
  id: string;
  title: string;
  description: string;
  court: Court;
  theme: Theme;
  teamId: string | null;
  shared: boolean;
  pages: unknown;
};

export async function saveWhiteboard(input: WhiteboardInput): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (!WB_EDIT_ROLES.includes(profile.role)) return { error: "Action réservée à l'équipe d'entraîneurs." };
  const title = input.title.trim().slice(0, 200);
  if (!title) return { error: "Le titre ne peut pas être vide." };
  const court: Court = input.court === "full" ? "full" : "half";
  const theme: Theme = input.theme === "sombre" || input.theme === "blanc" ? input.theme : "parquet";
  const pages = parsePages(input.pages, court);
  if (JSON.stringify(pages).length > 600_000) return { error: "Tableau trop chargé : allège-le ou coupe-le en plusieurs pages." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("whiteboards")
    .update({
      title,
      description: input.description.trim().slice(0, 2000) || null,
      court,
      theme,
      team_id: input.teamId || null,
      shared: !!input.shared,
      pages,
    })
    .eq("id", input.id)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Tu ne peux pas modifier ce tableau (créé par un autre coach)." };
  revalidatePath("/tableaux");
  return {};
}

export async function deleteWhiteboard(id: string): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (!WB_EDIT_ROLES.includes(profile.role)) return { error: "Action réservée à l'équipe d'entraîneurs." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("whiteboards").delete().eq("id", id).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Suppression impossible (tableau créé par un autre coach)." };
  revalidatePath("/tableaux");
  return {};
}
