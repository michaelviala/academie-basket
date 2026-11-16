"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { isSkillCategory } from "@/lib/skills";

const ROLES = ["admin", "directeur_sportif"];
type R = { error?: string };

async function guard(): Promise<R | null> {
  const p = await requireProfile();
  return ROLES.includes(p.role) ? null : { error: "Action réservée à la direction." };
}
function refresh() {
  for (const p of ["/administration", "/joueurs", "/seances"]) revalidatePath(p);
}

/** Crée ou renomme / reclasse une compétence du référentiel. */
export async function saveSkill(skillId: string | null, input: { name: string; category: string }): Promise<R> {
  const denied = await guard();
  if (denied) return denied;
  const name = input.name.trim().slice(0, 120);
  if (!name) return { error: "Le nom de la compétence est requis." };
  if (!isSkillCategory(input.category)) return { error: "Type de compétence inconnu." };
  const supabase = await createClient();
  const { data: dup } = await supabase.from("skills").select("id").eq("category", input.category).ilike("name", name).limit(1);
  if (dup && dup.length > 0 && dup[0].id !== skillId) return { error: `« ${name} » existe déjà dans ce type.` };
  const { error } = skillId
    ? await supabase.from("skills").update({ name, category: input.category }).eq("id", skillId)
    : await supabase.from("skills").insert({ name, category: input.category });
  if (error) return { error: error.message };
  refresh();
  return {};
}

/** Supprime une compétence ; refusé si des évaluations ou des blocs de séance l'utilisent. */
export async function deleteSkill(skillId: string): Promise<R> {
  const denied = await guard();
  if (denied) return denied;
  const supabase = await createClient();
  const [{ count: evals }, { count: blocks }] = await Promise.all([
    supabase.from("evaluations").select("id", { count: "exact", head: true }).eq("skill_id", skillId),
    supabase.from("training_exercises").select("id", { count: "exact", head: true }).eq("skill_id", skillId),
  ]);
  if ((evals ?? 0) > 0 || (blocks ?? 0) > 0) {
    return { error: `Cette compétence est utilisée (${evals ?? 0} évaluation(s), ${blocks ?? 0} bloc(s) de séance) : renomme-la plutôt que de la supprimer.` };
  }
  const { error } = await supabase.from("skills").delete().eq("id", skillId);
  if (error) return { error: error.message };
  refresh();
  return {};
}
