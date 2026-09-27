import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, ROLE_LABELS } from "@/lib/data";
import { CoachPhoto } from "@/components/coach-photo";
import { CoachContactForm } from "@/components/coach-contact-form";
import { CoachTeamsManager } from "@/components/coach-teams-manager";
import { updateCoachContact, assignTeam } from "./actions";

export default async function CoachPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireProfile();
  if (!["admin", "directeur_sportif"].includes(viewer.role)) notFound();

  const supabase = await createClient();

  const { data: coach } = await supabase
    .from("profiles")
    .select("*, team_coaches(teams(id, name, category))")
    .eq("id", id)
    .maybeSingle();

  if (!coach) notFound();

  const assignedTeamIds = coach.team_coaches?.map((tc) => tc.teams?.id).filter(Boolean) ?? [];

  const [{ data: allTeams }, { data: trainings }] = await Promise.all([
    supabase.from("teams").select("id, name, category").order("name"),
    supabase
      .from("trainings")
      .select("*, teams(name), gyms(name)")
      .eq("coach_id", id)
      .order("date", { ascending: true }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (trainings ?? []).filter((t) => t.date >= today).slice(0, 8);

  const currentMonth = today.slice(0, 7); // YYYY-MM
  const monthlyMinutes = (trainings ?? [])
    .filter((t) => t.date.slice(0, 7) === currentMonth)
    .reduce((sum, t) => sum + (t.duration_minutes ?? 0), 0);
  const monthlyHours = (monthlyMinutes / 60).toFixed(1);

  const assignableTeams = (allTeams ?? []).filter((t) => !assignedTeamIds.includes(t.id));
  const assignedTeams = (coach.team_coaches ?? [])
    .map((tc) => tc.teams)
    .filter((t): t is { id: string; name: string; category: string } => !!t);

  return (
    <div className="space-y-6">
      <Link href="/coachs" className="text-xs" style={{ color: "var(--text-faint)" }}>
        ← Retour aux coachs
      </Link>

      {/* PROFIL */}
      <div className="card flex flex-wrap items-center gap-4">
        <CoachPhoto
          coachId={coach.id}
          initialPhotoUrl={coach.avatar_url}
          initials={coach.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{coach.full_name}</h1>
          <div className="mt-1 flex flex-wrap gap-2">
            <span className="badge">{ROLE_LABELS[coach.role]}</span>
            <span className="badge">{coach.email}</span>
            {coach.phone && <span className="badge">{coach.phone}</span>}
          </div>
        </div>
        <div className="rounded-lg px-4 py-3 text-center" style={{ background: "var(--surf-2)" }}>
          <p className="display text-2xl font-bold">{monthlyHours} h</p>
          <p className="text-xs" style={{ color: "var(--text-faint)" }}>ce mois-ci</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* COORDONNEES */}
        <section className="card space-y-4">
          <h2 className="font-semibold">Coordonnées</h2>
          <CoachContactForm
            coachId={coach.id}
            initialPhone={coach.phone ?? ""}
            initialAddress={coach.address ?? ""}
            action={updateCoachContact}
          />
        </section>

        {/* EQUIPES */}
        <section className="card space-y-4">
          <h2 className="font-semibold">Équipes entraînées</h2>
          <CoachTeamsManager coachId={coach.id} teams={assignedTeams} />
          {assignableTeams.length > 0 && (
            <form action={assignTeam.bind(null, coach.id)} className="flex gap-2">
              <select className="input" name="team_id" required defaultValue="">
                <option value="" disabled>Ajouter une équipe</option>
                {assignableTeams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                ))}
              </select>
              <button className="btn-secondary whitespace-nowrap" type="submit">+ Assigner</button>
            </form>
          )}
        </section>
      </div>

      {/* CRENEAUX */}
      <section className="card">
        <h2 className="mb-3 font-semibold">Créneaux à venir</h2>
        <div className="space-y-2">
          {upcoming.map((t) => (
            <Link
              key={t.id}
              href={`/entrainements/${t.id}`}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
              style={{ background: "var(--surf-2)" }}
            >
              <span>
                {t.date} {t.start_time ? `· ${t.start_time}` : ""} · {t.teams?.name ?? "Équipe"}
              </span>
              <span style={{ color: "var(--text-faint)" }}>
                {t.duration_minutes ?? "?"} min · {t.gyms?.name ?? "Gymnase non défini"}
              </span>
            </Link>
          ))}
          {upcoming.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucun créneau à venir pour ce coach.</p>
          )}
        </div>
      </section>
    </div>
  );
}
