import { notFound } from "next/navigation";
import { requireProfile, ROLE_LABELS } from "@/lib/data";
import { createCoach } from "../actions";

const COACH_ROLES = ["coach", "directeur_sportif", "preparateur_physique"] as const;

export default async function NouveauCoachPage() {
  const profile = await requireProfile();
  if (!["admin", "directeur_sportif"].includes(profile.role)) notFound();

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Nouveau coach</h1>
      <p className="text-sm" style={{ color: "var(--text-faint)" }}>
        Le compte est créé directement (pas besoin d&apos;inscription). Un mot de passe temporaire sera affiché une seule
        fois après la création : à transmettre au coach.
      </p>

      <form action={createCoach} className="card grid gap-4">
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

        <button type="submit" className="btn-primary">Créer le compte coach</button>
      </form>
    </div>
  );
}
