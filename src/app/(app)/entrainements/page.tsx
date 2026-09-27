import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { TrainingCalendar } from "@/components/training-calendar";
import { NewTrainingModal } from "@/components/new-training-modal";

const COACH_ROLES = ["coach", "directeur_sportif", "preparateur_physique"] as const;

export default async function EntrainementsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: trainings }, { data: teams }, { data: gyms }, { data: coaches }] = await Promise.all([
    supabase
      .from("trainings")
      .select("*, teams(name), gyms(name)")
      .order("date", { ascending: false }),
    supabase.from("teams").select("id, name").order("name"),
    supabase.from("gyms").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name").in("role", COACH_ROLES).order("full_name"),
  ]);

  const canManage = ["admin", "directeur_sportif", "coach"].includes(profile.role);

  const today = new Date().toISOString().slice(0, 10);
  const past = (trainings ?? [])
    .filter((t) => t.date < today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);

  return (
    <div className="space-y-6">
      {/* PLANNING */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Entraînements</h1>
            <p className="text-sm" style={{ color: "var(--text-faint)" }}>Planning des séances</p>
          </div>
          {canManage && <NewTrainingModal teams={teams ?? []} gyms={gyms ?? []} coaches={coaches ?? []} />}
        </div>
        <TrainingCalendar
          trainings={trainings ?? []}
          teams={teams ?? []}
          coaches={coaches ?? []}
          gyms={gyms ?? []}
        />
      </section>

      {/* HISTORIQUE */}
      <section>
        <h2 className="mb-3 font-semibold">Historique</h2>
        <div className="space-y-2">
          {past.map((t) => (
            <Link
              key={t.id}
              href={`/entrainements/${t.id}`}
              className="card flex items-center justify-between transition-colors"
              style={{ display: "flex" }}
            >
              <div>
                <p className="font-medium">{t.teams?.name ?? "Équipe"} — {t.objective ?? "Séance"}</p>
                <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                  {t.date} {t.start_time ?? ""} · {t.duration_minutes ?? "?"} min · {t.gyms?.name ?? "Gymnase non défini"}
                </p>
              </div>
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>Voir le déroulé →</span>
            </Link>
          ))}
          {past.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucune séance passée.</p>
          )}
        </div>
      </section>
    </div>
  );
}
