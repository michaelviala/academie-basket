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
  for (const p of ["/administration", "/joueurs", "/seances", "/calendrier", "/dashboard"]) revalidatePath(p);
}
const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Crée ou modifie une saison (libellé + dates). */
export async function saveSeason(seasonId: string | null, formData: FormData): Promise<R> {
  const denied = await guard();
  if (denied) return denied;
  const label = String(formData.get("label") ?? "").trim().slice(0, 80);
  const start_date = String(formData.get("start_date") ?? "");
  const end_date = String(formData.get("end_date") ?? "");
  if (!label) return { error: "Donne un nom à la saison (ex. 2026-2027)." };
  if (!isDay(start_date) || !isDay(end_date)) return { error: "Les dates de début et de fin sont requises." };
  if (end_date <= start_date) return { error: "La date de fin doit être après la date de début." };
  const supabase = await createClient();
  if (seasonId) {
    const { error } = await supabase.from("seasons").update({ label, start_date, end_date }).eq("id", seasonId);
    if (error) return { error: error.message };
  } else {
    const { count } = await supabase.from("seasons").select("id", { count: "exact", head: true }).eq("is_active", true);
    const { error } = await supabase.from("seasons").insert({ label, start_date, end_date, is_active: (count ?? 0) === 0 });
    if (error) return { error: error.message };
  }
  refresh();
  return {};
}

/** Rend cette saison active (une seule à la fois) et la désarchive si besoin. */
export async function activateSeason(seasonId: string): Promise<R> {
  const denied = await guard();
  if (denied) return denied;
  const supabase = await createClient();
  const { error: e1 } = await supabase.from("seasons").update({ is_active: false }).neq("id", seasonId);
  if (e1) return { error: e1.message };
  const { error: e2 } = await supabase.from("seasons").update({ is_active: true, archived: false }).eq("id", seasonId);
  if (e2) return { error: e2.message };
  refresh();
  return {};
}

/** Archive / désarchive une saison. Une saison active ne peut pas être archivée. */
export async function archiveSeason(seasonId: string, archived: boolean): Promise<R> {
  const denied = await guard();
  if (denied) return denied;
  const supabase = await createClient();
  if (archived) {
    const { data } = await supabase.from("seasons").select("is_active").eq("id", seasonId).maybeSingle();
    if (data?.is_active) return { error: "Active d'abord une autre saison avant d'archiver celle-ci." };
  }
  const { error } = await supabase.from("seasons").update({ archived }).eq("id", seasonId);
  if (error) return { error: error.message };
  refresh();
  return {};
}

/** Supprime une saison sans catégorie ni joueur rattaché. */
export async function deleteSeason(seasonId: string): Promise<R> {
  const denied = await guard();
  if (denied) return denied;
  const supabase = await createClient();
  const { data } = await supabase.from("seasons").select("is_active").eq("id", seasonId).maybeSingle();
  if (data?.is_active) return { error: "Impossible de supprimer la saison active." };
  const { error } = await supabase.from("seasons").delete().eq("id", seasonId);
  if (error) return { error: error.message.includes("foreign key") ? "Des catégories ou des joueurs sont rattachés à cette saison : archive-la plutôt." : error.message };
  refresh();
  return {};
}
