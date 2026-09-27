import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/data";
import { NewCoachForm } from "@/components/new-coach-form";

export default async function NouveauCoachPage() {
  const profile = await requireProfile();
  if (!["admin", "directeur_sportif"].includes(profile.role)) notFound();

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Nouveau coach</h1>
      <p className="text-sm" style={{ color: "var(--text-faint)" }}>
        Le compte est créé directement (pas besoin d&apos;inscription). Un mot de passe temporaire sera affiché une seule
        fois après la création : à transmettre au coach. La photo et les équipes se gèrent ensuite sur sa fiche.
      </p>

      <NewCoachForm />
    </div>
  );
}
