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

export type ClubSettings = Tables<"club_settings">;

/** Récupère les réglages d'identité visuelle du club (logo, couleur). Toujours une seule ligne (id = true). */
export async function getClubSettings(): Promise<ClubSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("club_settings").select("*").eq("id", true).single();
  return data ?? { id: true, logo_url: null, brand_color: "#ff6a1f", updated_at: new Date().toISOString() };
}

/** Assombrit une couleur hex d'un certain pourcentage (pour l'état :hover des boutons). */
export function darkenHex(hex: string, amount = 0.15): string {
  const m = hex.replace("#", "");
  const num = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  if (Number.isNaN(num)) return hex;
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function calculateAge(birthDate: string): number {
  const today = new Date();
  const dob = new Date(birthDate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}
