"use client";

import { useState, useTransition } from "react";
import { createCoach } from "@/app/(app)/coachs/actions";

const COACH_ROLES = ["coach", "directeur_sportif", "preparateur_physique"] as const;

const ROLE_LABELS: Record<(typeof COACH_ROLES)[number], string> = {
  coach: "Coach",
  directeur_sportif: "Directeur sportif",
  preparateur_physique: "Préparateur physique",
};

export function NewCoachForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createCoach(formData);
      } catch (e) {
        // redirect() lève une exception spéciale côté Next.js (digest "NEXT_REDIRECT...") : à laisser remonter.
        const digest = (e as { digest?: unknown } | null)?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
        setError(e instanceof Error ? e.message : "Erreur inconnue.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="card grid gap-4">
      <div>
        <label className="label">Nom complet *</label>
        <input className="input" name="full_name" required />
      </div>
      <div>
        <label className="label">Email *</label>
        <input className="input" type="email" name="email" required />
      </div>
      <div>
        <label className="label">Téléphone</label>
        <input className="input" type="tel" name="phone" />
      </div>
      <div>
        <label className="label">Rôle *</label>
        <select className="input" name="role" required defaultValue="coach">
          {COACH_ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={isPending}>
        {isPending ? "Création en cours..." : "Créer le compte coach"}
      </button>
    </form>
  );
}
