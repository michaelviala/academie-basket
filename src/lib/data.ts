import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Tables } from "@/types/database";

export type Profile = Tables<"profiles">;

/** Récupère le profil (avec rôle) de l'utilisateur connecté. Redirige vers /login si non connecté. */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return profile;
}

export const ROLE_LABELS: Record<Profile["role"], string> = {
  admin: "Administrateur",
  directeur_sportif: "Directeur sportif",
  coach: "Coach",
  preparateur_physique: "Préparateur physique",
  joueur: "Joueur",
  parent: "Parent",
};

export function calculateAge(birthDate: string): number {
  const today = new Date();
  const dob = new Date(birthDate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}
