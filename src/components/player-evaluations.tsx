"use client";

import { useState } from "react";
import { PlayerEvaluationChart } from "@/components/player-evaluation-chart";

const EVAL_TYPE_LABELS: Record<string, string> = {
  technique: "Technique",
  tactique: "Tactique",
  physique: "Physique",
  mental: "Mental",
};

const EVAL_TYPES = ["technique", "tactique", "physique", "mental"] as const;
type EvalType = (typeof EVAL_TYPES)[number];

type Evaluation = {
  id: string;
  evaluation_type: string;
  score: number;
  comment: string | null;
  evaluated_at: string;
  skills: { name: string } | null;
};

export function PlayerEvaluations({
  evaluations,
  attendanceRate,
  attendancePresent,
  attendanceTotal,
}: {
  evaluations: Evaluation[];
  attendanceRate: number | null;
  attendancePresent: number;
  attendanceTotal: number;
}) {
  const [active, setActive] = useState<EvalType>("technique");

  const byType = (type: EvalType) => evaluations.filter((e) => e.evaluation_type === type);

  const avgByType = (type: EvalType) => {
    const rows = byType(type);
    if (rows.length === 0) return null;
    return (rows.reduce((s, r) => s + Number(r.score), 0) / rows.length).toFixed(1);
  };

  const activeRows = byType(active);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {EVAL_TYPES.map((t) => {
          const isActive = t === active;
          const rows = byType(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => setActive(t)}
              className="rounded-xl px-4 py-4 text-center transition-colors"
              style={{
                background: "var(--surf)",
                border: isActive ? "2px solid var(--brand)" : "1px solid var(--border)",
              }}
            >
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
                {EVAL_TYPE_LABELS[t]}
              </p>
              <p className="display mt-1 text-3xl font-bold">{avgByType(t) ?? "—"}</p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>
                {rows.length} évaluation{rows.length > 1 ? "s" : ""}
              </p>
            </button>
          );
        })}

        <div className="flex items-center gap-3 rounded-xl px-4 py-4" style={{ background: "var(--surf)", border: "1px solid var(--border)" }}>
          <div className="relative h-12 w-12 flex-shrink-0">
            <svg width="48" height="48" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="var(--surf-2)" strokeWidth="5" />
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="var(--green)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={125.6}
                strokeDashoffset={attendanceRate !== null ? 125.6 * (1 - attendanceRate / 100) : 125.6}
                transform="rotate(-90 24 24)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
              {attendanceRate !== null ? `${attendanceRate}%` : "—"}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
              Présence
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>
              {attendancePresent} / {attendanceTotal} entraînements
            </p>
          </div>
        </div>
      </div>
      <p className="mb-4 mt-2 text-xs" style={{ color: "var(--text-faint)" }}>
        Cliquer sur un indice affiche le détail de ses évaluations ci-dessous.
      </p>

      <div className="card mb-4">
        <h2 className="mb-3 font-semibold">Progression</h2>
        <PlayerEvaluationChart evaluations={evaluations} />
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Historique — {EVAL_TYPE_LABELS[active]}</h2>
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
            Moyenne : {avgByType(active) ?? "—"} / 5 sur {activeRows.length} évaluation{activeRows.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {activeRows.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surf-2)" }}>
              <div>
                <p className="font-medium">{e.skills?.name ?? EVAL_TYPE_LABELS[active]}</p>
                <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                  {e.evaluated_at}
                  {e.comment ? ` · ${e.comment}` : ""}
                </p>
              </div>
              <span className="badge" style={{ background: "rgba(255,106,31,0.14)", color: "var(--brand)", borderColor: "transparent" }}>
                {e.score}
              </span>
            </div>
          ))}
          {activeRows.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-faint)" }}>
              Aucune évaluation {EVAL_TYPE_LABELS[active].toLowerCase()} enregistrée.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
