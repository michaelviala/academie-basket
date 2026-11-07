"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";

const ROLES = ["admin", "directeur_sportif"];
type R = { error?: string };

async function guard(): Promise<R | null> {
  const p = await requireProfile();
  return ROLES.includes(p.role) ? null : { error: "Action réservée à la direction." };
}
function refresh() {
  revalidatePath("/administration");
  revalidatePath("/joueurs");
  revalidatePath("/seances");
  revalidatePath("/dashboard");
}

export async function saveTeam(teamId: string | null, formData: FormData): Promise<R> {
  const denied = await guard();
  if (denied) return denied;
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const seasonId = String(formData.get("season_id") ?? "");
  if (!name || !category) return { error: "Le nom et la catégorie sont requis." };
  const supabase = await createClient();
  if (teamId) {
    const { error } = await supabase.from("teams").update({ name, category, ...(seasonId ? { season_id: seasonId } : {}) }).eq("id", teamId);
    if (error) return { error: error.message };
  } else {
    if (!seasonId) return { error: "Choisis une saison." };
    const { error } = await supabase.from("teams").insert({ name, category, season_id: seasonId });
    if (error) return { error: error.message };
  }
  refresh();
  return {};
}

export async function deleteTeam(teamId: string): Promise<R> {
  const denied = await guard();
  if (denied) return denied;
  const supabase = await createClient();
  const { count } = await supabase.from("players").select("id", { count: "exact", head: true }).eq("team_id", teamId);
  if ((count ?? 0) > 0) return { error: "Cette catégorie a encore des joueurs : déplace-les d'abord." };
  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) return { error: "Suppression impossible : la catégorie est utilisée (séances, etc.)." };
  refresh();
  return {};
}

export async function movePlayer(playerId: string, teamId: string): Promise<R> {
  const denied = await guard();
  if (denied) return denied;
  const supabase = await createClient();
  const { error } = await supabase.from("players").update({ team_id: teamId }).eq("id", playerId);
  if (error) return { error: error.message };
  refresh();
  return {};
}
