import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { createTraining } from "./actions";
import { TrainingGymSelect } from "@/components/training-gym-select";

const WEEKDAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const weekday = WEEKDAY_LABELS[d.getDay()];
  return `${weekday} ${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}`;
}

export default async function EntrainementsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: trainings }, { data: teams }, { data: gyms }] = await Promise.all([
    supabase
      .from("trainings")
      .select("*, teams(name), gyms(name)")
      .order("date", { ascending: false })
      .limit(60),
    supabase.from("teams").select("id, name").order("name"),
    supabase.from("gyms").select("id, name").order("name"),
  ]);

  const canManage = ["admin", "directeur_sportif", "coach"].includes(profile.role);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (trainings ?? [])
    .filter((t) => t.date >= today)
    .sort((a, b) => (a.date === b.date ? (a.start_time ?? "").localeCompare(b.start_time ?? "") : a.date.localeCompare(b.date)));
  const past = (trainings ?? []).filter((t) => t.date < today);

  const upcomingByDate = new Map<string, typeof upcoming>();
  upcoming.forEach((t) => {
    const list = upcomingByDate.get(t.date) ?? [];
    list.push(t);
    upcomingByDate.set(t.date, list);
  });

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
          <select className="input" name="gym_id" defaultValue="">
            <option value="">Gymnase (optionnel)</option>
            {gyms?.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
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

      {/* PLANNING */}
      <section>
        <h2 className="mb-3 font-semibold">Planning</h2>
        {upcomingByDate.size === 0 && (
          <p className="card text-sm" style={{ color: "var(--text-faint)" }}>Aucune séance à venir.</p>
        )}
        <div className="space-y-4">
          {Array.from(upcomingByDate.entries()).map(([date, items]) => (
            <div key={date}>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
                {formatDateLabel(date)}
              </p>
              <div className="space-y-2">
                {items.map((t) => (
                  <div key={t.id} className="card flex flex-wrap items-center justify-between gap-3">
                    <Link href={`/entrainements/${t.id}`} className="flex-1">
                      <p className="font-medium">
                        {t.start_time ? `${t.start_time} · ` : ""}{t.teams?.name ?? "Équipe"} — {t.objective ?? "Séance"}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                        {t.duration_minutes ?? "?"} min · Intensité {t.intensity ?? "—"}
                        {!canManage && ` · ${t.gyms?.name ?? "Gymnase non défini"}`}
                      </p>
                    </Link>
                    {canManage ? (
                      <TrainingGymSelect trainingId={t.id} gyms={gyms ?? []} currentGymId={t.gym_id} />
                    ) : (
                      <span className="badge">{t.gyms?.name ?? "—"}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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
