import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { SYSTEM_EDIT_ROLES, parsePositions } from "@/lib/systems";
import { SystemsLibrary, type SystemCard } from "@/components/systems-library";
import { SystemEditor } from "@/components/system-editor";

export default async function SystemesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  const isEditor = SYSTEM_EDIT_ROLES.includes(profile.role);
  if (!isEditor && profile.role !== "preparateur_physique") notFound();

  const { data: systems } = await supabase
    .from("systems")
    .select("id, name, category, shared, created_by, updated_at")
    .order("updated_at", { ascending: false });
  const all = systems ?? [];

  const { data: seqRows } = all.length
    ? await supabase
        .from("system_sequences")
        .select("system_id, position, positions")
        .in("system_id", all.map((s) => s.id))
        .order("position")
    : { data: [] as { system_id: string; position: number; positions: unknown }[] };

  const first = new Map<string, unknown>();
  const counts = new Map<string, number>();
  for (const s of seqRows ?? []) {
    if (!first.has(s.system_id)) first.set(s.system_id, s.positions);
    counts.set(s.system_id, (counts.get(s.system_id) ?? 0) + 1);
  }
  const cards: SystemCard[] = all.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    shared: s.shared,
    sequenceCount: counts.get(s.id) ?? 0,
    preview: parsePositions(first.get(s.id)),
  }));

  if (id && !all.some((s) => s.id === id)) notFound();
  const selected = all.find((s) => s.id === id) ?? all[0] ?? null;

  let editor: React.ReactNode = (
    <div className="empty">
      Aucun système pour l&apos;instant.{isEditor ? " Crée le premier avec le bouton ＋ de la bibliothèque." : ""}
    </div>
  );

  if (selected) {
    const [{ data: seqs }, { data: clips }] = await Promise.all([
      supabase
        .from("system_sequences")
        .select("id, label, notes, position, positions")
        .eq("system_id", selected.id)
        .order("position"),
      supabase
        .from("video_clips")
        .select("id, title")
        .eq("system_id", selected.id)
        .order("created_at", { ascending: false }),
    ]);
    const canEdit =
      isEditor &&
      (selected.created_by === profile.id ||
        ["admin", "directeur_sportif"].includes(profile.role));
    editor = (
      <SystemEditor
        key={selected.id}
        system={{
          id: selected.id,
          name: selected.name,
          category: selected.category,
          shared: selected.shared,
        }}
        sequences={(seqs ?? []).map((s) => ({
          id: s.id,
          label: s.label,
          notes: s.notes,
          position: s.position,
          positions: parsePositions(s.positions),
        }))}
        canEdit={canEdit}
        linkedClips={clips ?? []}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <SystemsLibrary systems={cards} selectedId={selected?.id ?? null} canEdit={isEditor} />
      {editor}
    </div>
  );
}
