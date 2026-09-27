"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deleteFeedback, upsertFeedback } from "@/app/(app)/entrainements/[id]/actions";

const PRIORITY_LABELS: Record<string, string> = {
  haute: "Haute",
  moyenne: "Moyenne",
  basse: "Basse",
};

type Feedback = {
  id: string;
  positives: string | null;
  improvements: string | null;
  priority: string | null;
  next_session_goal: string | null;
  created_at: string;
};

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
};

export function TrainingFeedback({
  trainingId,
  players,
  feedbacksByPlayer,
  canManage,
}: {
  trainingId: string;
  players: Player[];
  feedbacksByPlayer: Record<string, Feedback[]>;
  canManage: boolean;
}) {
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(playerId: string, formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await upsertFeedback(trainingId, playerId, formData);
        setOpenPlayerId(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
      }
    });
  }

  function handleDelete(feedbackId: string) {
    startTransition(async () => {
      await deleteFeedback(trainingId, feedbackId);
    });
  }

  if (players.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-faint)" }}>
        Aucun joueur rattaché à cette équipe pour l&apos;instant.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}
      {players.map((p) => {
        const history = feedbacksByPlayer[p.id] ?? [];
        const isOpen = openPlayerId === p.id;
        return (
          <div key={p.id} className="rounded-xl p-3" style={{ background: "var(--surf)", border: "1px solid var(--border)" }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href={`/joueurs/${p.id}`} className="flex items-center gap-2 text-sm font-semibold">
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: "var(--surf-2, #1c1f26)", color: "var(--text-faint)" }}
                  >
                    {p.first_name[0]}
                    {p.last_name[0]}
                  </span>
                )}
                {p.first_name} {p.last_name}
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                  {history.length} feedback{history.length > 1 ? "s" : ""}
                </span>
                {canManage && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: 11, padding: "5px 10px" }}
                    onClick={() => setOpenPlayerId(isOpen ? null : p.id)}
                  >
                    {isOpen ? "Annuler" : "+ Feedback"}
                  </button>
                )}
              </div>
            </div>

            {history.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {history.map((f) => (
                  <div key={f.id} className="flex items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-xs" style={{ background: "var(--bg)" }}>
                    <div className="space-y-0.5">
                      {f.positives && <p><span style={{ color: "#4ade80" }}>+ </span>{f.positives}</p>}
                      {f.improvements && <p><span style={{ color: "#eda100" }}>→ </span>{f.improvements}</p>}
                      {f.next_session_goal && (
                        <p style={{ color: "var(--text-faint)" }}>Prochaine séance : {f.next_session_goal}</p>
                      )}
                      {f.priority && <span className="badge" style={{ fontSize: 10 }}>Priorité {PRIORITY_LABELS[f.priority] ?? f.priority}</span>}
                    </div>
                    {canManage && (
                      <button type="button" disabled={isPending} onClick={() => handleDelete(f.id)} style={{ color: "#f87171" }}>
                        🗑
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isOpen && (
              <form
                action={(fd) => handleSubmit(p.id, fd)}
                className="mt-3 grid grid-cols-1 gap-2 border-t pt-3 sm:grid-cols-2"
                style={{ borderColor: "var(--border)" }}
              >
                <textarea className="input sm:col-span-2" name="positives" placeholder="Points positifs" rows={2} />
                <textarea className="input sm:col-span-2" name="improvements" placeholder="Axes d'amélioration" rows={2} />
                <select className="input" name="priority" defaultValue="">
                  <option value="">Priorité (optionnel)</option>
                  <option value="haute">Haute</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="basse">Basse</option>
                </select>
                <input className="input" name="next_session_goal" placeholder="Objectif prochaine séance" />
                <button className="btn-primary sm:col-span-2" type="submit" disabled={isPending}>
                  Enregistrer le feedback
                </button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
