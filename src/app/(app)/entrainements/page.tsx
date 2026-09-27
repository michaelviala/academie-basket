import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { createTraining } from "./actions";

export default async function EntrainementsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: trainings }, { data: teams }] = await Promise.all([
    supabase
      .from("trainings")
      .select("*, teams(name)")
      .order("date", { ascending: false })
      .limit(30),
    supabase.from("teams").select("id, name").order("name"),
  ]);

  const canManage = ["admin", "directeur_sportif", "coach"].includes(profile.role);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Entraînements</h1>

      {canManage && (
        <form action={createTraining} className="card grid gap-3 sm:grid-cols-2">
          <h2 className="col-span-2 font-semibold">Nouvelle séance</h2>
          <input className="input" type="date" name="date" required />
          <input className="input" type="time" name="start_time" />
          <select className="input" name="team_id" required defaultValue="">
            <option value="" disabled>Équipe</option>
            {teams?.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <input className="input" type="number" name="duration_minutes" placeholder="Durée (min)" />
          <input className="input col-span-2" name="objective" placeholder="Objectif de la séance" />
          <select className="input" name="intensity" defaultValue="">
            <option value="">Intensité</option>
            <option value="faible">Faible</option>
            <option value="moyenne">Moyenne</option>
            <option value="elevee">Élevée</option>
          </select>
          <button className="btn-primary sm:col-span-2" type="submit">Ajouter la séance</button>
        </form>
      )}

      <div className="space-y-2">
        {trainings?.map((t) => (
          <Link
            key={t.id}
            href={`/entrainements/${t.id}`}
            className="card flex items-center justify-between transition-colors"
            style={{ display: "flex" }}
          >
            <div>
              <p className="font-medium">{t.teams?.name ?? "Équipe"} — {t.objective ?? "Séance"}</p>
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                {t.date} {t.start_time ?? ""} · {t.duration_minutes ?? "?"} min · Intensité {t.intensity ?? "—"}
              </p>
            </div>
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>Voir le déroulé →</span>
          </Link>
        ))}
        {(!trainings || trainings.length === 0) && (
          <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucune séance planifiée.</p>
        )}
      </div>
    </div>
  );
}
