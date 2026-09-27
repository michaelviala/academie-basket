"use client";

import { useState, useTransition } from "react";

type Meeting = {
  id: string;
  meeting_date: string;
  participants: string | null;
  summary: string | null;
};

type StatSnapshot = {
  typeAverages: { label: string; value: number | null }[];
  attendanceRate: number | null;
  attendancePresent: number;
  attendanceTotal: number;
  goalsInProgress: number;
  goalsAchieved: number;
  lastFeedback: string | null;
};

export function Meetings({
  playerId,
  meetings,
  snapshot,
  action,
}: {
  playerId: string;
  meetings: Meeting[];
  snapshot: StatSnapshot;
  action: (playerId: string, formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await action(playerId, formData);
        setShowForm(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg p-3" style={{ background: "var(--surf-2, #1c1f26)" }}>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Progression</p>
          <p className="mt-1 text-xs">
            {snapshot.typeAverages.map((t) => `${t.label} ${t.value !== null ? t.value.toFixed(1) : "—"}`).join(" · ")}
          </p>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: "var(--surf-2, #1c1f26)" }}>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Présence</p>
          <p className="mt-1 text-xl font-bold">{snapshot.attendanceRate !== null ? `${snapshot.attendanceRate}%` : "—"}</p>
          <p className="text-xs" style={{ color: "var(--text-faint)" }}>{snapshot.attendancePresent} / {snapshot.attendanceTotal} entraînements</p>
        </div>
        <div className="rounded-lg p-3" style={{ background: "var(--surf-2, #1c1f26)" }}>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Objectifs</p>
          <p className="mt-1 text-xs">{snapshot.goalsAchieved} atteint{snapshot.goalsAchieved > 1 ? "s" : ""} · {snapshot.goalsInProgress} en cours</p>
        </div>
        <div className="rounded-lg p-3" style={{ background: "var(--surf-2, #1c1f26)" }}>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Dernier feedback</p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>{snapshot.lastFeedback ?? "Aucun"}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          {meetings.length} réunion{meetings.length > 1 ? "s" : ""}
        </p>
        <button type="button" className="btn-secondary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Annuler" : "+ Nouvelle réunion"}
        </button>
      </div>

      {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}

      {showForm && (
        <form action={(fd) => handleSubmit(fd)} className="space-y-3 rounded-lg p-3" style={{ background: "var(--surf-2, #1c1f26)" }}>
          <label className="-mb-1 block text-xs" style={{ color: "var(--text-faint)" }}>Date</label>
          <input className="input" type="date" name="meeting_date" />
          <input className="input" name="participants" placeholder="Participants (ex. Coach Martin, Directeur sportif, Parent)" />
          <textarea className="input" name="summary" placeholder="Compte rendu" rows={4} />
          <button className="btn-primary" type="submit" disabled={isPending}>Clôturer la réunion</button>
        </form>
      )}

      <div className="space-y-2">
        {meetings.map((m) => (
          <div key={m.id} className="rounded-lg p-3 text-sm" style={{ background: "var(--surf-2, #1c1f26)" }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{m.meeting_date}</span>
              {m.participants && <span className="text-xs" style={{ color: "var(--text-faint)" }}>{m.participants}</span>}
            </div>
            {m.summary && <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>{m.summary}</p>}
          </div>
        ))}
        {meetings.length === 0 && !showForm && (
          <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucune réunion de suivi enregistrée.</p>
        )}
      </div>
    </div>
  );
}
