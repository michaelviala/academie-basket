"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SystemCourt } from "@/components/system-court";
import { SYSTEM_CATEGORIES, categoryLabel, type TokenPosition } from "@/lib/systems";
import { createSystem } from "@/app/(app)/systemes/actions";

export type SystemCard = {
  id: string;
  name: string;
  category: string;
  shared: boolean;
  sequenceCount: number;
  preview: TokenPosition[];
};

export function SystemsLibrary({
  systems,
  selectedId,
  canEdit,
}: {
  systems: SystemCard[];
  selectedId: string | null;
  canEdit: boolean;
}) {
  const [cat, setCat] = useState("");
  const [creating, setCreating] = useState(false);

  const cats = useMemo(
    () => SYSTEM_CATEGORIES.filter((c) => systems.some((s) => s.category === c.value)),
    [systems],
  );
  const list = systems.filter((s) => !cat || s.category === cat);
  const chip = (active: boolean) =>
    active
      ? { background: "color-mix(in srgb, var(--brand) 18%, transparent)", borderColor: "var(--brand)", color: "var(--brand)" }
      : undefined;

  return (
    <aside className="card min-w-0 space-y-3 lg:self-start">
      <div className="flex items-center justify-between">
        <h2 className="display text-xl font-bold uppercase">Bibliothèque</h2>
        {canEdit && (
          <button className="btn-primary !px-2.5 !py-1.5" onClick={() => setCreating(true)} aria-label="Nouveau système">＋</button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button className="chip" style={chip(cat === "")} onClick={() => setCat("")}>Tous · {systems.length}</button>
        {cats.map((c) => (
          <button key={c.value} className="chip" style={chip(cat === c.value)} onClick={() => setCat(c.value)}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {list.map((s) => (
          <Link
            key={s.id}
            href={`/systemes?id=${s.id}`}
            className="flex w-[240px] shrink-0 items-center gap-3 rounded-lg border p-2 lg:w-auto"
            style={{
              borderColor: s.id === selectedId ? "var(--brand)" : "var(--border)",
              background: s.id === selectedId ? "color-mix(in srgb, var(--brand) 12%, transparent)" : "var(--surf-2)",
            }}
          >
            <div className="w-[60px] shrink-0">
              <SystemCourt positions={s.preview} mini />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{s.name}</p>
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                {categoryLabel(s.category)} · {s.sequenceCount} séquence{s.sequenceCount > 1 ? "s" : ""}
                {s.shared ? " · partagé" : ""}
              </p>
            </div>
          </Link>
        ))}
        {list.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucun système.</p>
        )}
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center" onClick={() => setCreating(false)}>
          <form action={createSystem} className="card w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold">Nouveau système</h2>
            <input className="input" name="name" placeholder="Nom (ex. Horns Flare)" required maxLength={120} autoFocus />
            <select className="input" name="category" defaultValue="attaque_placee">
              {SYSTEM_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="shared" defaultChecked /> Partagé avec l&apos;équipe
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setCreating(false)}>Annuler</button>
              <button className="btn-primary">Créer</button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
}
