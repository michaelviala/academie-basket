"use client";

import { teamColor } from "@/lib/category-color";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignTeam, unassignTeam } from "@/app/(app)/coachs/[id]/actions";

export type AdminCoach = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  roleLabel: string;
  teams: { id: string; name: string; category: string; color?: string | null }[];
};
type Team = { id: string; name: string; category: string };

export function AdminCoaches({ coaches, teams, canCreate }: { coaches: AdminCoach[]; teams: Team[]; canCreate: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function add(coachId: string, fd: FormData) {
    setError(null);
    start(async () => {
      try {
        await assignTeam(coachId, fd);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }
  function remove(coachId: string, teamId: string) {
    setError(null);
    start(async () => {
      const r = await unassignTeam(coachId, teamId);
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>
          Les coachs du club et les catégories qu&apos;ils entraînent. Le coach d&apos;une séance se choisit dans la séance elle-même.
        </p>
        <Link href="/coachs/nouveau" className="btn-primary whitespace-nowrap">+ Nouveau coach</Link>
      </div>
      {!canCreate && (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(245,158,11,0.12)", color: "#fbbf24" }}>
          La création de compte n&apos;est pas encore activée sur le serveur : ajoute la variable <code>SUPABASE_SERVICE_ROLE_KEY</code> (clé secrète « service_role » de Supabase) dans le fichier d&apos;environnement du VPS, puis relance.
        </p>
      )}
      {error && (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>{error}</p>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {coaches.map((c) => {
          const free = teams.filter((t) => !c.teams.some((x) => x.id === t.id));
          return (
            <div key={c.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/coachs/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                  <p className="truncate text-xs" style={{ color: "var(--text-faint)" }}>
                    {c.email}{c.phone ? ` · ${c.phone}` : ""}
                  </p>
                </div>
                <span className="badge">{c.roleLabel}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.teams.map((t) => (
                  <span key={t.id} className="chip" style={{ color: teamColor(t), borderColor: teamColor(t) }}>
                    {t.name}
                    <button type="button" disabled={pending} onClick={() => remove(c.id, t.id)} aria-label={`Retirer ${t.name}`} className="ml-1">×</button>
                  </span>
                ))}
                {c.teams.length === 0 && <span className="text-xs" style={{ color: "var(--text-faint)" }}>Aucune catégorie</span>}
              </div>
              {free.length > 0 && (
                <form action={(fd) => add(c.id, fd)} className="flex gap-2">
                  <select className="input" name="team_id" required defaultValue="">
                    <option value="" disabled>Affecter à une catégorie…</option>
                    {free.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                    ))}
                  </select>
                  <button className="btn-secondary whitespace-nowrap" disabled={pending} type="submit">Affecter</button>
                </form>
              )}
            </div>
          );
        })}
        {coaches.length === 0 && <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucun coach pour l&apos;instant.</p>}
      </div>
    </div>
  );
}
