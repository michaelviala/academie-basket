import { createClient } from "@/lib/supabase/server";

const COACH_ROLES = [
  "coach",
  "directeur_sportif",
  "preparateur_physique",
] as const;

/** Listes nécessaires au formulaire de séance (catégories, gymnases, coachs, compétences). */
export async function getSessionFormData() {
  const supabase = await createClient();
  const [{ data: teams }, { data: gyms }, { data: coaches }, { data: skills }, { data: systems }] =
    await Promise.all([
      supabase.from("teams").select("id, name").order("name"),
      supabase.from("gyms").select("id, name").order("name"),
      supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", COACH_ROLES)
        .order("full_name"),
      supabase
        .from("skills")
        .select("id, category, name")
        .order("category")
        .order("name"),
      supabase.from("systems").select("id, name").order("name"),
    ]);
  return {
    teams: teams ?? [],
    gyms: gyms ?? [],
    coaches: coaches ?? [],
    skills: skills ?? [],
    systems: systems ?? [],
  };
}
