import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type NotificationType = Database["public"]["Tables"]["notifications"]["Row"]["type"];

/** Crée une notification pour le compte "appli" d'un joueur (aucun effet si le joueur n'a pas de compte). */
export async function notifyPlayer(playerId: string, type: NotificationType, message: string) {
  const supabase = await createClient();

  const { data: player } = await supabase
    .from("players")
    .select("user_id")
    .eq("id", playerId)
    .maybeSingle();

  if (!player?.user_id) return;

  await supabase.from("notifications").insert({
    user_id: player.user_id,
    type,
    message,
    player_id: playerId,
  });
}

/** Crée une notification pour tous les comptes ayant l'un des rôles donnés (ex. staff). */
export async function notifyStaffRoles(
  roles: Database["public"]["Tables"]["profiles"]["Row"]["role"][],
  type: NotificationType,
  message: string,
  playerId?: string
) {
  const supabase = await createClient();

  const { data: profiles } = await supabase.from("profiles").select("id").in("role", roles);
  if (!profiles?.length) return;

  await supabase.from("notifications").insert(
    profiles.map((p) => ({
      user_id: p.id,
      type,
      message,
      player_id: playerId ?? null,
    }))
  );
}
