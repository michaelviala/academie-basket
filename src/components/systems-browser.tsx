"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SystemCourt } from "@/components/system-court";
import { normalize } from "@/lib/library";
import {
  SYSTEM_CATEGORIES,
  categoryLabel,
  type TokenPosition,
} from "@/lib/systems";
import { createSystem } from "@/app/(app)/systemes/actions";

export type SystemCard = {
  id: string;
  name: string;
  category: string;
  shared: boolean;
  sequenceCount: number;
  preview: TokenPosition[];
  mine: boolean;
};

export function SystemsBrowser({
  systems,
  canEdit,
}: {
  systems: SystemCard[];
  canEdit: boolean;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const n = normalize(q.trim());
    return systems.filter(
      (s) =>
        (!cat || s.category === cat) &&
        (!n || normalize(s.name).includes(n) || normalize(categoryLabel(s.category)).includes(n)),
    );
  }, [systems, q, cat]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input min-w-0 flex-1 sm:max-w-sm"
          placeholder="Rechercher un système…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {canEdit && (
          <button className="btn-primary" onClick={() => setCreating(true)}>
            + Nouveau système
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[{ value: "", label: "Tous" }, ...SYSTEM_CATEGORIES].map((c) => (
          <button
            key={c.value}
            className="chip"
            onClick={() => setCat(c.value)}
            style={
              cat === c.value
                ? { background: "var(--brand)", color: "#fff", borderColor: "var(--brand)" }
                : undefined
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          {systems.length === 0
            ? "Aucun système pour l'instant. Crée le premier : terrain, jeton, séquences."
            : "Aucun système ne correspond."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <Link
              key={s.id}
              href={`/systemes?id=${s.id}`}
              className="card block min-w-0 !p-3 transition hover:-translate-y-0.5"
            >
              <SystemCourt positions={s.preview} mini />
              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{s.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                    {categoryLabel(s.category)} · {s.sequenceCount} séquence
                    {s.sequenceCount > 1 ? "s" : ""}
                  </p>
                </div>
                {s.shared && <span className="badge shrink-0">Partagé</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
          onClick={() => setCreating(false)}
        >
          <form
            action={createSystem}
            className="card w-full max-w-md space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold">Nouveau système</h2>
            <input className="input" name="name" placeholder="Nom (ex. Pick & roll côté faible)" required maxLength={120} autoFocus />
            <select className="input" name="category" defaultValue="attaque_placee">
              {SYSTEM_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="shared" defaultChecked /> Partagé avec tous les coachs
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setCreating(false)}>
                Annuler
              </button>
              <button className="btn-primary">Créer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
