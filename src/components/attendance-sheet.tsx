"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ATTENDANCE_STATUSES } from "@/lib/attendance";
import { setAttendance, markAllPresent } from "@/app/(app)/seances/actions";

type P = { id: string; first_name: string; last_name: string };

export function AttendanceSheet({
  trainingId,
  players,
  initial,
  canManage,
}: {
  trainingId: string;
  players: P[];
  initial: Record<string, string>;
  canManage: boolean;
}) {
  const [saved, setSaved] = useState(initial);
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  function choose(playerId: string, value: string) {
    if (!canManage) return;
    const next = optimistic[playerId] === value ? null : value; // 2e tap = effacer
    setError(null);
    start(async () => {
      setOptimistic((cur) => {
        const c = { ...cur };
        if (next) c[playerId] = next; else delete c[playerId];
        return c;
      });
      const r = await setAttendance(trainingId, playerId, next);
      if (r.error) setError(r.error);
      else
        setSaved((cur) => {
          const c = { ...cur };
          if (next) c[playerId] = next; else delete c[playerId];
          return c;
        });
    });
  }

  function allPresent() {
    setError(null);
    start(async () => {
      setOptimistic((cur) => {
        const c = { ...cur };
        players.forEach((p) => { if (!c[p.id]) c[p.id] = "present"; });
        return c;
      });
      const r = await markAllPresent(trainingId, players.map((p) => p.id));
      if (r.error) setError(r.error);
      else
        setSaved((cur) => {
          const c = { ...cur };
          players.forEach((p) => { if (!c[p.id]) c[p.id] = "present"; });
          return c;
        });
    });
  }

  const counts = ATTENDANCE_STATUSES.map((s) => ({ ...s, n: players.filter((p) => optimistic[p.id] === s.value).length }));
  const unset = players.filter((p) => !optimistic[p.id]).length;

  if (players.length === 0) {
    return <p className="text-sm text-faint">Aucun joueur dans l&apos;équipe de cette séance.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2 text-xs">
          {counts.map((c) => (
            <span key={c.value} className="flex items-center gap-1.5 text-faint">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
              {c.label} {c.n}
            </span>
          ))}
          {unset > 0 && <span className="text-faint">· {unset} non renseigné(s)</span>}
        </div>
        {canManage && unset > 0 && (
          <button type="button" className="btn-secondary" onClick={allPresent}>Tous présents</button>
        )}
      </div>
      {error && (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>{error}</p>
      )}
      <ul className="space-y-1.5">
        {players.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2" style={{ background: "var(--surf-2)" }}>
            <span className="text-sm font-medium">{p.first_name} {p.last_name}</span>
            <div className="flex gap-1.5" role="group" aria-label={`Présence de ${p.first_name}`}>
              {ATTENDANCE_STATUSES.map((s) => {
                const on = optimistic[p.id] === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    disabled={!canManage}
                    onClick={() => choose(p.id, s.value)}
                    aria-pressed={on}
                    title={s.label}
                    className="h-10 min-w-10 rounded-lg px-2 text-xs font-bold"
                    style={{
                      background: on ? s.color : "transparent",
                      color: on ? "#111" : "var(--text-dim)",
                      border: `1.5px solid ${on ? s.color : "var(--border)"}`,
                    }}
                  >
                    <span className="sm:hidden">{s.short}</span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
