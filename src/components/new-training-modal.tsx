"use client";

import { useState, useTransition } from "react";
import { createTraining } from "@/app/(app)/entrainements/actions";

export function NewTrainingModal({
  teams,
  gyms,
  coaches,
}: {
  teams: { id: string; name: string }[];
  gyms: { id: string; name: string }[];
  coaches: { id: string; full_name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createTraining(formData);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue.");
      }
    });
  }

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        + Ajouter une nouvelle séance
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-lg"
            style={{ maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Nouvelle séance</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                style={{ color: "var(--text-faint)" }}
              >
                ✕
              </button>
            </div>

            <form action={handleSubmit} className="grid gap-3 sm:grid-cols-2">
              <input className="input" type="date" name="date" required />
              <input className="input" type="time" name="start_time" />
              <select className="input" name="team_id" required defaultValue="">
                <option value="" disabled>Équipe</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <select className="input" name="coach_id" defaultValue="">
                <option value="">Coach (optionnel)</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
              <select className="input" name="gym_id" defaultValue="">
                <option value="">Gymnase (optionnel)</option>
                {gyms.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <input className="input" type="number" name="duration_minutes" placeholder="Durée (min)" />
              <input className="input sm:col-span-2" name="objective" placeholder="Objectif de la séance" />
              <select className="input" name="intensity" defaultValue="">
                <option value="">Intensité</option>
                <option value="faible">Faible</option>
                <option value="moyenne">Moyenne</option>
                <option value="elevee">Élevée</option>
              </select>

              {error && (
                <p className="sm:col-span-2 text-sm" style={{ color: "#f87171" }}>{error}</p>
              )}

              <button className="btn-primary sm:col-span-2" type="submit" disabled={isPending}>
                {isPending ? "Ajout en cours..." : "Ajouter la séance"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
