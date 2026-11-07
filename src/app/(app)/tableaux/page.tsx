import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClubSettings, requireProfile } from "@/lib/data";
import { WB_EDIT_ROLES, parsePages } from "@/lib/whiteboard";
import { WhiteboardsList, type WbCard } from "@/components/whiteboards-list";

export default async function TableauxPage() {
  const profile = await requireProfile();
  if (![...WB_EDIT_ROLES, "preparateur_physique", "joueur"].includes(profile.role)) notFound();
  const canCreate = WB_EDIT_ROLES.includes(profile.role);
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("whiteboards")
    .select("id, title, court, theme, shared, pages, team_id, created_by, updated_at")
    .order("updated_at", { ascending: false });
  const list = rows ?? [];

  const teamIds = [...new Set(list.flatMap((r) => (r.team_id ? [r.team_id] : [])))];
  const authorIds = [...new Set(list.flatMap((r) => (r.created_by ? [r.created_by] : [])))];
  const [{ data: teams }, { data: authors }] = await Promise.all([
    teamIds.length ? supabase.from("teams").select("id, name").in("id", teamIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    authorIds.length && profile.role !== "joueur"
      ? supabase.from("profiles").select("id, full_name").in("id", authorIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);
  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const authorName = new Map((authors ?? []).map((a) => [a.id, a.full_name]));

  const cards: WbCard[] = list.map((r) => {
    const court = r.court === "full" ? "full" : "half";
    const pages = parsePages(r.pages, court);
    return {
      id: r.id,
      title: r.title,
      court,
      theme: r.theme === "sombre" || r.theme === "blanc" ? r.theme : "parquet",
      els: pages[0].els,
      pageCount: pages.length,
      shared: r.shared,
      teamName: r.team_id ? (teamName.get(r.team_id) ?? null) : null,
      authorName: r.created_by ? (authorName.get(r.created_by) ?? null) : null,
      mine: r.created_by === profile.id,
    };
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-2xl font-bold sm:text-3xl">Tableau blanc</h1>
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>
          {canCreate
            ? "Explique un exercice ou un concept sur un terrain : pose les joueurs, trace les déplacements, ajoute une consigne. Partage-le ensuite avec les joueurs."
            : "Les exercices et les explications partagés par tes coachs."}
        </p>
      </div>
      <WhiteboardsList cards={cards} canCreate={canCreate} logoUrl={(await getClubSettings()).logo_url} />
    </div>
  );
}
