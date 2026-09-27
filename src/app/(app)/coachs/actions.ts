"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const COACH_ROLES = ["coach", "directeur_sportif", "preparateur_physique"] as const;

function randomTempPassword() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export async function createCoach(formData: FormData) {
  const viewer = await requireProfile();
  if (!["admin", "directeur_sportif"].includes(viewer.role)) {
    throw new Error("Action réservée aux administrateurs.");
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "coach");
  const phone = String(formData.get("phone") ?? "").trim();

  if (!fullName || !email) throw new Error("Le nom et l'email sont requis.");
  if (!COACH_ROLES.includes(role as (typeof COACH_ROLES)[number])) {
    throw new Error("Rôle invalide.");
  }

  const admin = createAdminClient();
  if (!admin) {
    throw new Error(
      "La création directe de compte n'est pas configurée sur ce serveur (clé service_role manquante). " +
        "Demande à un administrateur d'ajouter SUPABASE_SERVICE_ROLE_KEY dans les variables d'environnement du serveur."
    );
  }

  const tempPassword = randomTempPassword();

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (error) throw new Error(error.message);

  // Le trigger handle_new_user crée déjà la ligne profiles (id, email, full_name, role).
  // On complète juste le téléphone si fourni.
  if (phone && created.user) {
    const supabase = await createClient();
    await supabase.from("profiles").update({ phone }).eq("id", created.user.id);
  }

  revalidatePath("/coachs");
  redirect(`/coachs/${created.user!.id}?temp_password=${encodeURIComponent(tempPassword)}`);
}
