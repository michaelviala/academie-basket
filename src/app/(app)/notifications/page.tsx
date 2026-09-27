import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { NotificationList } from "@/components/notification-list";
import { markAllAsRead, markAsRead } from "./actions";

export default async function NotificationsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, message, player_id, is_read, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-2xl font-bold">Notifications</h1>
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>
          Nouveautés concernant vous ou vos joueurs.
        </p>
      </div>

      <NotificationList notifications={notifications ?? []} markAsRead={markAsRead} markAllAsRead={markAllAsRead} />
    </div>
  );
}
