"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { revalidatePath } from "next/cache";

export async function markAsRead(notificationId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", profile.id);
  if (error) return { error: error.message };
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function markAllAsRead() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", profile.id)
    .eq("is_read", false);
  if (error) return { error: error.message };
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  return { success: true };
}
