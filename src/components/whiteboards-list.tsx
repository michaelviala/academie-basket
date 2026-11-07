"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WbStatic } from "@/components/whiteboard-scene";
import { createWhiteboard } from "@/app/(app)/tableaux/actions";
import type { Court, Theme, WbEl } from "@/lib/whiteboard";

export type WbCard = {
  id: string;
  title: string;
  court: Court;
  theme: Theme;
  els: WbEl[];
  pageCount: number;
  shared: boolean;
  teamName: string | null;
  authorName: string | null;
  mine: boolean;
};

export function WhiteboardsList({ cards, canCreate }: { cards: WbCard[]; canCreate: boolean }) {
  const router = useRouter();
  const uid = useId().replace(/:/g, "");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [court, setCourt] = useState<Court>("half");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await createWhiteboard({ title, court });
      if (r.error || !r.id) return setError(r.error ?? "Création impossible.");
      router.push(`/tableaux/${r.id}`);
    });
  }

  return (
    <div className="space-y-4">
      {canCreate && (
        <div>
          {!open ? (
            <button className="btn-primary" onClick={() => setOpen(true)}>+ Nouveau tableau</button>
          ) : (
            <form onSubmit={create} className="card flex flex-wrap items-end gap-3">
              <label className="min-w-0 flex-1 text-xs" style={{ color: "var(--text-faint)" }}>
                Titre
                <input className="input mt-1 w-full" autoFocus required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Pick and roll central" />
              </label>
              <div>
                <p className="mb-1 text-xs" style={{ color: "var(--text-faint)" }}>Terrain</p>
                <div className="seg">
                  <button type="button" className={court === "half" ? "active" : ""} onClick={() => setCourt("half")}>Demi-terrain</button>
                  <button type="button" className={court === "full" ? "active" : ""} onClick={() => setCourt("full")}>Terrain complet</button>
                </div>
              </div>
              <button className="btn-primary" disabled={pending}>Créer</button>
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Annuler</button>
              {error && <p className="w-full text-xs" style={{ color: "#f87171" }}>{error}</p>}
            </form>
          )}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="empty">
          {canCreate ? "Aucun tableau pour l'instant. Crée le premier avec « Nouveau tableau »." : "Aucun tableau partagé pour l'instant."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.id} href={`/tableaux/${c.id}`} className="card block min-w-0 !p-3">
              <div className="overflow-hidden rounded-lg">
                <WbStatic court={c.court} theme={c.theme} els={c.els} uid={`${uid}${c.id.slice(0, 6)}-`} label={`Aperçu du tableau ${c.title}`} />
              </div>
              <p className="mt-2 truncate font-semibold">{c.title}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="chip">{c.court === "half" ? "Demi-terrain" : "Terrain complet"}</span>
                {c.pageCount > 1 && <span className="chip">{c.pageCount} pages</span>}
                {c.teamName && <span className="chip">{c.teamName}</span>}
                {canCreate && <span className="chip">{c.shared ? "Visible joueurs" : "Brouillon"}</span>}
              </div>
              {c.authorName && !c.mine && (
                <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>par {c.authorName}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
