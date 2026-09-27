import Link from "next/link";
import { requireProfile, calculateAge } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

async function DirectionDashboard() {
  const supabase = await createClient();

  const [
    { count: playersCount },
    { count: teamsCount },
    { count: evaluationsCount },
    { count: goalsInProgress },
    { count: goalsAchieved },
    { count: injuredCount },
    { data: attendanceRows },
  ] = await Promise.all([
    supabase.from("players").select("*", { count: "exact", head: true }).eq("status", "actif"),
    supabase.from("teams").select("*", { count: "exact", head: true }),
    supabase.from("evaluations").select("*", { count: "exact", head: true }),
    supabase.from("goals").select("*", { count: "exact", head: true }).eq("status", "en_cours"),
    supabase.from("goals").select("*", { count: "exact", head: true }).eq("status", "atteint"),
    supabase.from("players").select("*", { count: "exact", head: true }).eq("status", "blesse"),
    supabase.from("attendance").select("status"),
  ]);

  const total = attendanceRows?.length ?? 0;
  const present = attendanceRows?.filter((a) => a.status === "present").length ?? 0;
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord — Direction</h1>
        <p className="text-sm text-slate-500">Vue d&apos;ensemble de l&apos;académie.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Joueurs actifs" value={playersCount ?? 0} />
        <StatCard label="Équipes" value={teamsCount ?? 0} />
        <StatCard label="Taux de présence" value={attendanceRate !== null ? `${attendanceRate}%` : "—"} />
        <StatCard label="Évaluations" value={evaluationsCount ?? 0} />
        <StatCard label="Objectifs en cours" value={goalsInProgress ?? 0} />
        <StatCard label="Objectifs atteints" value={goalsAchieved ?? 0} />
        <StatCard label="Joueurs blessés" value={injuredCount ?? 0} />
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Accès rapides</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/joueurs" className="btn-secondary">Voir les joueurs</Link>
          <Link href="/equipes" className="btn-secondary">Gérer les équipes</Link>
          <Link href="/rapports" className="btn-secondary">Générer un rapport</Link>
        </div>
      </div>
    </div>
  );
}

async function PlayerDashboard(playerUserId: string) {
  const supabase = await createClient();

  const { data: player } = await supabase
    .from("players")
    .select("*, teams(name, category)")
    .eq("user_id", playerUserId)
    .maybeSingle();

  if (!player) {
    return (
      <div className="card">
        <p>Aucune fiche joueur n&apos;est encore associée à votre compte. Contactez votre coach.</p>
      </div>
    );
  }

  const [{ data: evaluations }, { data: goals }] = await Promise.all([
    supabase
      .from("evaluations")
      .select("evaluation_type, score")
      .eq("player_id", player.id),
    supabase
      .from("goals")
      .select("*")
      .eq("player_id", player.id)
      .order("due_date", { ascending: true }),
  ]);

  const avgByType = (type: string) => {
    const rows = evaluations?.filter((e) => e.evaluation_type === type) ?? [];
    if (rows.length === 0) return null;
    return (rows.reduce((s, r) => s + Number(r.score), 0) / rows.length).toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {player.first_name} {player.last_name}
        </h1>
        <p className="text-sm text-slate-500">
          {player.teams?.name ?? "Sans équipe"} · {calculateAge(player.birth_date)} ans
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Indice technique" value={avgByType("technique") ?? "—"} />
        <StatCard label="Indice tactique" value={avgByType("tactique") ?? "—"} />
        <StatCard label="Indice physique" value={avgByType("physique") ?? "—"} />
        <StatCard label="Indice mental" value={avgByType("mental") ?? "—"} />
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Mes objectifs</h2>
        {goals && goals.length > 0 ? (
          <ul className="space-y-2">
            {goals.map((g) => (
              <li key={g.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <span>{g.title}</span>
                <span className="badge bg-slate-100 text-slate-600">{g.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">Aucun objectif défini pour le moment.</p>
        )}
      </div>

      <Link href={`/joueurs/${player.id}`} className="btn-primary inline-flex w-fit">
        Voir ma fiche complète
      </Link>
    </div>
  );
}

export default async function DashboardPage() {
  const profile = await requireProfile();

  if (profile.role === "joueur") {
    return await PlayerDashboard(profile.id);
  }

  if (profile.role === "parent") {
    const supabase = await createClient();
    const { data: children } = await supabase
      .from("parent_player")
      .select("players(id, first_name, last_name, photo_url)")
      .eq("parent_id", profile.id);

    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Mes enfants</h1>
        {children && children.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {children.map((c) => c.players && (
              <Link key={c.players.id} href={`/joueurs/${c.players.id}`} className="card block hover:border-orange-300">
                <p className="font-semibold">{c.players.first_name} {c.players.last_name}</p>
                <p className="text-sm text-slate-400">Voir la fiche complète →</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Aucun enfant n&apos;est encore rattaché à votre compte.</p>
        )}
      </div>
    );
  }

  // admin, directeur_sportif, coach, preparateur_physique
  return await DirectionDashboard();
}
