"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { GUIDE_EDIT_ROLES, sanitizeGuide } from "@/lib/technical-guide";
import type { Json } from "@/types/database";

export async function saveTechnicalGuide(raw: unknown): Promise<{ success?: true; error?: string }> {
  const profile = await requireProfile();
  if (!(GUIDE_EDIT_ROLES as readonly string[]).includes(profile.role)) {
    return { error: "Seuls les administrateurs, directeurs sportifs et coachs peuvent modifier les carnets techniques." };
  }

  const content = sanitizeGuide(raw);
  if (content.categories.length === 0) {
    return { error: "Le cahier doit contenir au moins une catégorie." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("technical_guide")
    .upsert({ id: true, content: content as unknown as Json, updated_by: profile.id });

  if (error) return { error: error.message };

  revalidatePath("/carnet-technique");
  return { success: true };
}
