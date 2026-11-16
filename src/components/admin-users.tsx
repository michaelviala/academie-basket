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
      <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "var(--surf-2)" }}>
            <tr className="text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
              <th className="px-3 py-2">Nom</th>
              <th className="px-3 py-2">E-mail</th>
              <th className="px-3 py-2">Rôle</th>
              <th className="px-3 py-2">Liaison</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((u) => (
              <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td className="px-3 py-2 font-medium">{u.name}{u.id === meId && <span className="ml-1 text-xs text-faint">(moi)</span>}</td>
                <td className="px-3 py-2 text-xs text-faint"><a href={`mailto:${u.email}`} className="underline">{u.email}</a></td>
                <td className="px-3 py-2">
                  <select
                    className="input" style={{ width: "auto", padding: "4px 8px" }} value={u.role} disabled={pending || u.id === meId}
                    onChange={(e) => run(() => setUserRole(u.id, e.target.value))}
                    aria-label={`Rôle de ${u.name}`}
                  >
                    {Object.entries(roles).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 text-xs">
                  {u.role === "joueur" && (
                    <div className="flex items-center gap-2">
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      {u.children.map((c) => (
                        <span key={c} className="chip">{nameOf(c)}<button className="ml-1" aria-label="Retirer" disabled={pending} onClick={() => run(() => linkParentChild(u.id, c, false))}>×</button></span>
                      ))}
                      <select className="input" style={{ width: "auto", padding: "2px 6px", fontSize: 12 }} defaultValue="" disabled={pending}
                        onChange={(e) => { if (e.target.value) run(() => linkParentChild(u.id, e.target.value, true)); e.target.value = ""; }}>
                        <option value="">+ Relier un enfant…</option>
                        {players.filter((p) => !u.children.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  )}
                  {u.role !== "joueur" && u.role !== "parent" && <span className="text-faint">—</span>}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-3 text-sm text-faint">Aucun résultat.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
