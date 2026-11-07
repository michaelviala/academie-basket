import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClubSettings, requireProfile } from "@/lib/data";
import { WB_EDIT_ROLES, parsePages } from "@/lib/whiteboard";
import { Whiteboard, type WbBoard } from "@/components/whiteboard";

export default async function TableauPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  if (![...WB_EDIT_ROLES, "preparateur_physique", "joueur"].includes(profile.role)) notFound();
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("whiteboards")
    .select("id, title, description, court, theme, team_id, shared, pages, created_by")
    .eq("id", id)
    .maybeSingle();
  if (!row) notFound();

  const isDirection = ["admin", "directeur_sportif"].includes(profile.role);
  const canEdit = WB_EDIT_ROLES.includes(profile.role) && (isDirection || row.created_by === profile.id);

  const [{ data: teams }, { data: author }, settings] = await Promise.all([
    canEdit ? supabase.from("teams").select("id, name").order("name") : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    row.created_by && profile.role !== "joueur"
      ? supabase.from("profiles").select("full_name").eq("id", row.created_by).maybeSingle()
      : Promise.resolve({ data: null }),
    getClubSettings(),
  ]);

  const court = row.court === "full" ? "full" : "half";
  const board: WbBoard = {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    court,
    theme: row.theme === "sombre" || row.theme === "blanc" ? row.theme : "parquet",
    teamId: row.team_id,
    shared: row.shared,
    pages: parsePages(row.pages, court),
    authorName: author?.full_name ?? null,
    logoUrl: settings.logo_url,
  };

  return <Whiteboard board={board} teams={teams ?? []} canEdit={canEdit} />;
}
