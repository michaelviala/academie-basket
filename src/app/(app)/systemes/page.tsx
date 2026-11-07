import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import {
  SYSTEM_EDIT_ROLES,
  categoryLabel,
  parsePositions,
} from "@/lib/systems";
import { SystemsBrowser, type SystemCard } from "@/components/systems-browser";
import { SystemEditor } from "@/components/system-editor";

export default async function SystemesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  const isStaff = SYSTEM_EDIT_ROLES.includes(profile.role) || profile.role === "preparateur_physique";

  if (id) {
    const { data: system } = await supabase
      .from("systems")
      .select("id, name, category, shared, created_by")
      .eq("id", id)
      .maybeSingle();
    if (!system) notFound();

    const { data: seqs } = await supabase
      .from("system_sequences")
      .select("id, label, notes, position, positions")
      .eq("system_id", id)
      .order("position");

    const canEdit =
      SYSTEM_EDIT_ROLES.includes(profile.role) &&
      (system.created_by === profile.id ||
        ["admin", "directeur_sportif"].includes(profile.role));

    return (
      <div className="space-y-4">
        <Link href="/systemes" className="text-xs" style={{ color: "var(--text-faint)" }}>
          ← Tous les systèmes
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--brand)" }}>
            {categoryLabel(system.category)}
          </p>
          <h1 className="display mt-1 text-2xl font-bold sm:text-3xl">{system.name}</h1>
        </div>
        <SystemEditor
          key={system.id}
          system={{
            id: system.id,
            name: system.name,
            category: system.category,
            shared: system.shared,
          }}
          sequences={(seqs ?? []).map((s) => ({
            id: s.id,
            label: s.label,
            notes: s.notes,
            position: s.position,
            positions: parsePositions(s.positions),
          }))}
          canEdit={canEdit}
        />
      </div>
    );
  }

  if (!isStaff) notFound();

  const { data: systems } = await supabase
    .from("systems")
    .select("id, name, category, shared, created_by, updated_at")
    .order("updated_at", { ascending: false });

  const ids = (systems ?? []).map((s) => s.id);
  const { data: seqs } = ids.length
    ? await supabase
        .from("system_sequences")
        .select("system_id, position, positions")
        .in("system_id", ids)
        .order("position")
    : { data: [] as { system_id: string; position: number; positions: unknown }[] };

  const first = new Map<string, unknown>();
  const counts = new Map<string, number>();
  for (const s of seqs ?? []) {
    if (!first.has(s.system_id)) first.set(s.system_id, s.positions);
    counts.set(s.system_id, (counts.get(s.system_id) ?? 0) + 1);
  }

  const cards: SystemCard[] = (systems ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    shared: s.shared,
    sequenceCount: counts.get(s.id) ?? 0,
    preview: parsePositions(first.get(s.id)),
    mine: s.created_by === profile.id,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-2xl font-bold sm:text-3xl">Systèmes</h1>
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>
          Schémas de jeu animés : placements, séquences et déplacements.
        </p>
      </div>
      <SystemsBrowser
        systems={cards}
        canEdit={SYSTEM_EDIT_ROLES.includes(profile.role)}
      />
    </div>
  );
}
