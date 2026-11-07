"use client";

import { useState, useTransition } from "react";

export function CoachParcoursForm({
  coachId,
  initialParcours,
  action,
}: {
  coachId: string;
  initialParcours: string;
  action: (coachId: string, formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await action(coachId, formData);
      setSaved(true);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <textarea
        className="input"
        name="parcours"
        rows={6}
        defaultValue={initialParcours}
        placeholder="Parcours de joueur, diplômes (BPJEPS, DES…), clubs précédents, expériences d'entraîneur…"
        onChange={() => setSaved(false)}
      />
      <div className="flex items-center gap-3">
        <button className="btn-secondary" type="submit" disabled={isPending}>
          {isPending ? "Enregistrement…" : "Enregistrer le parcours"}
        </button>
        {saved && !isPending && <span className="text-xs" style={{ color: "var(--green)" }}>Parcours mis à jour.</span>}
      </div>
    </form>
  );
}
