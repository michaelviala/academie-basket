"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { cleanGuardian, type Guardian, type GuardianInput } from "@/lib/guardians";

const ROLES = ["admin", "directeur_sportif"];

type Row = {
  id: string;
  player_id: string;
  full_name: string;
  relationship: string;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  notes: string | null;
};
const toGuardian = (r: Row): Guardian => ({
  id: r.id,
  playerId: r.player_id,
  fullName: r.full_name,
  relationship: (["mere", "pere", "tuteur"].includes(r.relationship) ? r.relationship : "autre") as Guardian["relationship"],
  email: r.email ?? "",
  phone: r.phone ?? "",
  isPrimary: r.is_primary,
  notes: r.notes ?? "",
});
const COLS = "id, player_id, full_name, relationship, email, phone, is_primary, notes";

async function guard() {
  const profile = await requireProfile();
  return ROLES.includes(profile.role) ? profile : null;
}

/** Un seul contact principal par joueur. */
async function singlePrimary(supabase: Awaited<ReturnType<typeof createClient>>, playerId: string, keepId: string) {
  await supabase.from("player_guardians").update({ is_primary: false }).eq("player_id", playerId).neq("id", keepId);
}

export async function addGuardian(input: GuardianInput): Promise<{ guardian?: Guardian; error?: string }> {
  if (!(await guard())) return { error: "Action réservée à la direction." };
  const c = cleanGuardian(input);
  if ("error" in c) return c;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("player_guardians")
    .insert({
      player_id: c.ok.playerId,
      full_name: c.ok.fullName,
      relationship: c.ok.relationship,
      email: c.ok.email || null,
      phone: c.ok.phone || null,
      is_primary: c.ok.isPrimary,
      notes: c.ok.notes || null,
    })
    .select(COLS)
    .single();
  if (error || !data) return { error: error?.message ?? "Ajout impossible." };
  if (c.ok.isPrimary) await singlePrimary(supabase, c.ok.playerId, data.id);
  revalidatePath("/administration");
  return { guardian: toGuardian(data) };
}

export async function updateGuardian(id: string, input: GuardianInput): Promise<{ guardian?: Guardian; error?: string }> {
  if (!(await guard())) return { error: "Action réservée à la direction." };
  const c = cleanGuardian(input);
  if ("error" in c) return c;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("player_guardians")
    .update({
      full_name: c.ok.fullName,
      relationship: c.ok.relationship,
      email: c.ok.email || null,
      phone: c.ok.phone || null,
      is_primary: c.ok.isPrimary,
      notes: c.ok.notes || null,
    })
    .eq("id", id)
    .select(COLS)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Parent introuvable." };
  if (c.ok.isPrimary) await singlePrimary(supabase, data.player_id, id);
  revalidatePath("/administration");
  return { guardian: toGuardian(data) };
}

export async function deleteGuardian(id: string): Promise<{ error?: string }> {
  if (!(await guard())) return { error: "Action réservée à la direction." };
  const supabase = await createClient();
  const { error } = await supabase.from("player_guardians").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/administration");
  return {};
}
