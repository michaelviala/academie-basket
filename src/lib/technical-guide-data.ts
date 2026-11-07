import { createClient } from "@/lib/supabase/server";
import { sanitizeGuide, type TechnicalGuide } from "@/lib/technical-guide";

/** Lit le cahier technique du club (une seule ligne, id = true). */
export async function getTechnicalGuide(): Promise<{
  guide: TechnicalGuide;
  updatedAt: string | null;
  updatedBy: string | null;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("technical_guide")
    .select("content, updated_at, updated_by")
    .eq("id", true)
    .maybeSingle();

  let updatedBy: string | null = null;
  if (data?.updated_by) {
    const { data: author } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", data.updated_by)
      .maybeSingle();
    updatedBy = author?.full_name ?? null;
  }

  return {
    guide: sanitizeGuide(data?.content),
    updatedAt: data?.updated_at ?? null,
    updatedBy,
  };
}
