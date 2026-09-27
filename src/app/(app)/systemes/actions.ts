"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type TokenPosition = { label: string; x: number; y: number };

const DEFAULT_POSITIONS: TokenPosition[] = [
  { label: "1", x: 50, y: 92 },
  { label: "2", x: 15, y: 28 },
  { label: "3", x: 85, y: 28 },
  { label: "4", x: 32, y: 58 },
  { label: "5", x: 68, y: 52 },
];

export async function createSystem(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "attaque_placee");
  const shared = formData.get("shared") === "on";
  if (!name) throw new Error("Le nom du système est requis.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: system, error } = await supabase
    .from("systems")
    .insert({ name, category, shared, created_by: user?.id ?? null })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("system_sequences").insert({
    system_id: system.id,
    position: 0,
    label: "Placement",
    positions: DEFAULT_POSITIONS,
  });

  revalidatePath("/systemes");
  redirect(`/systemes?id=${system.id}`);
}

export async function deleteSystem(systemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("systems").delete().eq("id", systemId);
  if (error) throw new Error(error.message);
  revalidatePath("/systemes");
  redirect("/systemes");
}

export async function updateSystemMeta(systemId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("systems")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      category: String(formData.get("category") ?? "attaque_placee"),
      shared: formData.get("shared") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", systemId);
  if (error) return { error: error.message };
  revalidatePath("/systemes");
  return { success: true };
}

export async function addSequence(systemId: string, afterPosition: number, positions: TokenPosition[]) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("system_sequences")
    .select("id, position")
    .eq("system_id", systemId)
    .order("position", { ascending: true });

  const nextPosition = afterPosition + 1;

  // Décale les séquences suivantes pour laisser la place
  const toShift = (existing ?? []).filter((s) => s.position >= nextPosition);
  await Promise.all(
    toShift.map((s) => supabase.from("system_sequences").update({ position: s.position + 1 }).eq("id", s.id))
  );

  const { data: created, error } = await supabase
    .from("system_sequences")
    .insert({
      system_id: systemId,
      position: nextPosition,
      label: `Séquence ${(existing?.length ?? 0) + 1}`,
      positions,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/systemes");
  return { success: true, sequence: created };
}

export async function deleteSequence(sequenceId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("system_sequences").delete().eq("id", sequenceId);
  if (error) return { error: error.message };
  revalidatePath("/systemes");
  return { success: true };
}

export async function updateSequenceLabel(sequenceId: string, label: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("system_sequences").update({ label }).eq("id", sequenceId);
  if (error) return { error: error.message };
  revalidatePath("/systemes");
  return { success: true };
}

export async function updateSequenceNotes(sequenceId: string, notes: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("system_sequences").update({ notes: notes || null }).eq("id", sequenceId);
  if (error) return { error: error.message };
  revalidatePath("/systemes");
  return { success: true };
}

export async function updateSequencePositions(sequenceId: string, positions: TokenPosition[]) {
  const supabase = await createClient();
  const { error } = await supabase.from("system_sequences").update({ positions }).eq("id", sequenceId);
  if (error) return { error: error.message };
  return { success: true };
}
