"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserRole, linkPlayerAccount, linkParentChild } from "@/app/(app)/administration/users";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  linkedPlayerId: string | null;
  children: string[];
};
type PlayerOpt = { id: string; name: string; userId: string | null };

export function AdminUsers({ users, players, roles, meId }: { users: AdminUser[]; players: PlayerOpt[]; roles: Record<string, string>; meId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (r.error) setError(r.error); else router.refresh();
    });
  }
  const shown = users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "?";

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Utilisateurs ({users.length})</h2>
        <input className="input" style={{ width: 220 }} placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="text-xs text-faint">
        Change le rôle d&apos;un compte et relie les comptes joueurs à leur fiche et les parents à leurs enfants. Un nouveau compte (inscription) est « joueur » par défaut.
      </p>
      {error && <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>{error}</p>}
      <div className="space-y-2">
        {shown.map((u) => (
          <div key={u.id} className="space-y-2 rounded-lg p-3" style={{ background: "var(--surf-2)" }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium">{u.name}</p>
                <p className="truncate text-xs text-faint">{u.email}</p>
              </div>
              <select
                className="input" style={{ width: "auto" }} value={u.role} disabled={pending || u.id === meId}
                onChange={(e) => run(() => setUserRole(u.id, e.target.value))}
                aria-label={`Rôle de ${u.name}`}
              >
                {Object.entries(roles).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {u.role === "joueur" && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-faint">Fiche joueur :</span>
                <select
                  className="input" style={{ width: "auto", padding: "2px 6px", fontSize: 12 }} value={u.linkedPlayerId ?? ""} disabled={pending}
                  onChange={(e) => run(() => linkPlayerAccount(u.id, e.target.value || null))}
                >
                  <option value="">— non reliée —</option>
                  {players.filter((p) => !p.userId || p.userId === u.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            {u.role === "parent" && (
              <div className="space-y-1.5 text-xs">
                <div className="flex flex-wrap gap-1.5">
                  {u.children.map((c) => (
                    <span key={c} className="chip">{nameOf(c)}<button className="ml-1" aria-label="Retirer" disabled={pending} onClick={() => run(() => linkParentChild(u.id, c, false))}>×</button></span>
                  ))}
                  {u.children.length === 0 && <span className="text-faint">Aucun enfant relié</span>}
                </div>
                <select className="input" style={{ width: "auto", padding: "2px 6px", fontSize: 12 }} defaultValue="" disabled={pending}
                  onChange={(e) => { if (e.target.value) run(() => linkParentChild(u.id, e.target.value, true)); e.target.value = ""; }}>
                  <option value="">+ Relier un enfant…</option>
                  {players.filter((p) => !u.children.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>
        ))}
        {shown.length === 0 && <p className="text-sm text-faint">Aucun résultat.</p>}
      </div>
    </div>
  );
}
