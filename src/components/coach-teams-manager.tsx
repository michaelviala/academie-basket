"use client";

import { useTransition } from "react";
import { unassignTeam } from "@/app/(app)/coachs/[id]/actions";

type Team = { id: string; name: string; category: string };

export function CoachTeamsManager({ coachId, teams }: { coachId: string; teams: Team[] }) {
  const [isPending, startTransition] = useTransition();

  function handleRemove(teamId: string) {
    startTransition(async () => {
      await unassignTeam(coachId, teamId);
    });
  }

  return (
    <div className="space-y-2">
      {teams.map((t) => (
        <div key={t.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surf-2)" }}>
          <span>
            {t.name} <span style={{ color: "var(--text-faint)" }}>({t.category})</span>
          </span>
          <button type="button" disabled={isPending} onClick={() => handleRemove(t.id)} className="text-xs" style={{ color: "#f87171" }}>
            Retirer
          </button>
        </div>
      ))}
      {teams.length === 0 && (
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucune équipe assignée.</p>
      )}
    </div>
  );
}
