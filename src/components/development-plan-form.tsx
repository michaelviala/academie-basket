"use client";

import { useState, useTransition } from "react";

export function DevelopmentPlanForm({
  playerId,
  initialStrengths,
  initialWeaknesses,
  action,
}: {
  playerId: string;
  initialStrengths: string;
  initialWeaknesses: string;
  action: (playerId: string, formData: FormData) => Promise<void>;
}) {
  const [strengths, setStrengths] = useState(initialStrengths);
  const [weaknesses, setWeaknesses] = useState(initialWeaknesses);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await action(playerId, formData);
      setSaved(true);
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label">Points forts</label>
        <textarea
          className="input"
          name="strengths"
          rows={3}
          placeholder="Ex. Adresse extérieure, sens du jeu collectif"
          value={strengths}
          onChange={(e) => setStrengths(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Axes d&apos;amélioration</label>
        <textarea
          className="input"
          name="weaknesses"
          rows={3}
          placeholder="Ex. Explosivité, main faible"
          value={weaknesses}
          onChange={(e) => setWeaknesses(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn-secondary" type="submit" disabled={isPending}>
          {isPending ? "Enregistrement…" : "Enregistrer le plan"}
        </button>
        {saved && !isPending && (
          <span className="text-xs" style={{ color: "var(--green)" }}>Plan mis à jour.</span>
        )}
      </div>
    </form>
  );
}
