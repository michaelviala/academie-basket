import { createClient } from "@/lib/supabase/server";
import { isHex } from "@/lib/category-color";
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

  const colors = await getCategoryColors();
  const guide = sanitizeGuide(data?.content);
  guide.categories = guide.categories.map((c) => ({ ...c, color: colors[c.code] ?? c.color }));

  return {
    guide,
    updatedAt: data?.updated_at ?? null,
    updatedBy,
  };
}

/** Couleur de chaque catégorie (code → #rrggbb) : celle définie dans Administration, sinon celle du carnet. */
export async function getCategoryColors(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const [{ data }, { data: teams }] = await Promise.all([
    supabase.from("technical_guide").select("content").eq("id", true).maybeSingle(),
    supabase.from("teams").select("category, color"),
  ]);
  const map: Record<string, string> = Object.fromEntries(sanitizeGuide(data?.content).categories.map((c) => [c.code, c.color]));
  for (const t of teams ?? []) if (isHex(t.color)) map[t.category] = t.color;
  return map;
}
