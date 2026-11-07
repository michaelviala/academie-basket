"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";

type R = { error?: string };
const ROLE_VALUES = ["admin", "directeur_sportif", "coach", "preparateur_physique", "joueur", "parent"] as const;

async function adminOnly() {
  const p = await requireProfile();
  return p.role === "admin" ? p : null;
}

export async function setUserRole(userId: string, role: string): Promise<R> {
  const me = await adminOnly();
  if (!me) return { error: "Action réservée aux administrateurs." };
  if (me.id === userId) return { error: "Tu ne peux pas modifier ton propre rôle (pour ne pas te bloquer)." };
  if (!(ROLE_VALUES as readonly string[]).includes(role)) return { error: "Rôle invalide." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role: role as (typeof ROLE_VALUES)[number] }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/administration");
  return {};
}

/** Relie un compte « joueur » à sa fiche joueur (players.user_id). playerId vide = délier. */
export async function linkPlayerAccount(userId: string, playerId: string | null): Promise<R> {
  const me = await adminOnly();
  if (!me) return { error: "Action réservée aux administrateurs." };
  const supabase = await createClient();
  await supabase.from("players").update({ user_id: null }).eq("user_id", userId);
  if (playerId) {
    const { error } = await supabase.from("players").update({ user_id: userId }).eq("id", playerId);
    if (error) return { error: error.message };
  }
  revalidatePath("/administration");
  return {};
}

export async function linkParentChild(parentId: string, playerId: string, link: boolean): Promise<R> {
  const me = await adminOnly();
  if (!me) return { error: "Action réservée aux administrateurs." };
  const supabase = await createClient();
  const { error } = link
    ? await supabase.from("parent_player").insert({ parent_id: parentId, player_id: playerId })
    : await supabase.from("parent_player").delete().eq("parent_id", parentId).eq("player_id", playerId);
  if (error) return { error: error.code === "23505" ? "Déjà relié." : error.message };
  revalidatePath("/administration");
  return {};
}
