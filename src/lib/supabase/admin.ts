import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Client Supabase "admin" (clé service_role) — server-only, jamais exposé au navigateur.
 * Utilisé uniquement pour des opérations que la clé publique ne permet pas,
 * comme la création d'un compte utilisateur (auth.admin.createUser) sans passer
 * par l'auto-inscription.
 *
 * Nécessite la variable d'environnement SUPABASE_SERVICE_ROLE_KEY côté serveur
 * (Project Settings > API > service_role, dans le dashboard Supabase).
 * Ne jamais préfixer cette variable par NEXT_PUBLIC_, ni la committer.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
