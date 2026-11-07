import Link from "next/link";
import { requireProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { formatDateLong } from "@/lib/sessions";
import { PresenceChart } from "@/components/presence-chart";
import { PlayerSummary } from "@/components/player-summary";

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

type Upcoming = {
  id: string; date: string; start_time: string | null; objective: string | null;
  coach_id: string | null; gym_id: string | null; teams: { name: string } | null; gyms: { name: string } | null;
};

function SessionList({ rows, empty }: { rows: Upcoming[]; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-faint">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {rows.map((t) => (
        <li key={t.id}>
          <Link href={`/seances/${t.id}`} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surf-2)" }}>
            <span className="min-w-0 truncate">
              <b>{formatDateLong(t.date)}</b>
              {t.start_time ? ` · ${t.start_time.slice(0, 5)}` : ""} — {t.teams?.name ?? "Équipe"}
              {t.objective ? <span className="text-faint"> · {t.objective}</span> : null}
            </span>
            <span className="badge shrink-0">{t.gyms?.name ?? "Salle ?"}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Alert({ children, href }: { children: React.ReactNode; href?: string }) {
  const inner = <span>{children}</span>;
  return (
    <li className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(245,158,11,0.1)", color: "#fbbf24" }}>
      {href ? <Link href={href} className="hover:underline">{inner} →</Link> : inner}
    </li>
  );
}

async function DirectionDashboard(profile: { id: string; role: string; full_name: string }) {
  const supabase = await createClient();
  const isCoach = profile.role === "coach";

  // Équipes du coach (le staff direction voit tout le club)
  let myTeamIds: string[] | null = null;
  let myTeams: { id: string; name: string; category: string }[] = [];
  if (isCoach) {
    const { data } = await supabase.from("team_coaches").select("teams(id, name, category)").eq("coach_id", profile.id);
    myTeams = (data ?? []).map((r) => r.teams).filter((t): t is { id: string; name: string; category: string } => !!t);
    myTeamIds = myTeams.map((t) => t.id);
  }

  const playersQ = supabase.from("players").select("id, first_name, last_name, status, team_id");
  const [{ data: players }, { data: attendanceRows }, { data: upcoming }, { data: past }, { data: evals }, { data: teamsAll }, { data: tcAll }] = await Promise.all([
    myTeamIds ? (myTeamIds.length ? playersQ.in("team_id", myTeamIds) : playersQ.limit(0)) : playersQ,
    supabase.from("attendance").select("status, player_id, training_id, trainings(date)"),
    supabase
      .from("trainings")
      .select("id, date, start_time, objective, coach_id, gym_id, team_id, teams(name), gyms(name)")
      .gte("date", todayStr())
      .lte("date", plusDays(14))
      .order("date")
      .order("start_time"),
    supabase
      .from("trainings")
      .select("id, date, start_time, objective, coach_id, gym_id, team_id, teams(name), gyms(name)")
      .gte("date", plusDays(-14))
      .lt("date", todayStr())
      .order("date", { ascending: false }),
    supabase.from("evaluations").select("player_id, evaluated_at"),
    supabase.from("teams").select("id, name"),
    supabase.from("team_coaches").select("team_id"),
  ]);

  const inScope = (teamId: string | null) => !myTeamIds || (teamId !== null && myTeamIds.includes(teamId));
  const upcomingMine = (upcoming ?? []).filter((t) => inScope(t.team_id)) as Upcoming[];
  const pastMine = (past ?? []).filter((t) => inScope(t.team_id));

  const playerIds = new Set((players ?? []).map((p) => p.id));
  const att = (attendanceRows ?? []).filter((a) => playerIds.has(a.player_id));
  const present = att.filter((a) => a.status === "present" || a.status === "retard").length;
  const attendanceRate = att.length > 0 ? Math.round((present / att.length) * 100) : null;
  const months: { key: string; label: string; ok: number; n: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("fr-FR", { month: "short" }), ok: 0, n: 0 });
  }
  for (const a of att) {
    const date = (a.trainings as { date: string } | null)?.date;
    const m = date ? months.find((x) => x.key === date.slice(0, 7)) : undefined;
    if (!m) continue;
    m.n++;
    if (a.status === "present" || a.status === "retard") m.ok++;
  }
  const chart = months.map((m) => ({ label: m.label, rate: m.n ? Math.round((m.ok / m.n) * 100) : 0, sessions: m.n }));
  const sessionsWithAttendance = new Set((attendanceRows ?? []).map((a) => a.training_id));
  const toCall = pastMine.filter((t) => !sessionsWithAttendance.has(t.id));

  const injured = (players ?? []).filter((p) => p.status === "blesse");
  const active = (players ?? []).filter((p) => p.status === "actif").length;

  const lastEval = new Map<string, string>();
  (evals ?? []).forEach((e) => {
    if (!lastEval.get(e.player_id) || e.evaluated_at > lastEval.get(e.player_id)!) lastEval.set(e.player_id, e.evaluated_at);
  });
  const limit = plusDays(-60);
  const staleEval = (players ?? []).filter((p) => p.status === "actif" && (lastEval.get(p.id) ?? "") < limit);

  const teamsWithCoach = new Set((tcAll ?? []).map((r) => r.team_id));
  const teamsNoCoach = isCoach ? [] : (teamsAll ?? []).filter((t) => !teamsWithCoach.has(t.id));
  const missingInfo = upcomingMine.filter((t) => !t.coach_id || !t.gym_id);

  const alerts: React.ReactNode[] = [];
  if (toCall.length > 0) alerts.push(<Alert key="call" href={`/seances/${toCall[0].id}`}>{toCall.length} séance(s) passée(s) sans appel de présence</Alert>);
  if (injured.length > 0) alerts.push(<Alert key="inj">{injured.length} joueur(s) blessé(s) : {injured.slice(0, 4).map((p) => p.first_name).join(", ")}{injured.length > 4 ? "…" : ""}</Alert>);
  if (staleEval.length > 0) alerts.push(<Alert key="eval" href="/joueurs">{staleEval.length} joueur(s) sans évaluation depuis 60 jours ou plus</Alert>);
  if (missingInfo.length > 0) alerts.push(<Alert key="miss" href={`/seances/${missingInfo[0].id}`}>{missingInfo.length} séance(s) à venir sans coach ou sans salle</Alert>);
  if (teamsNoCoach.length > 0) alerts.push(<Alert key="tnc" href="/administration?vue=coachs">Équipe(s) sans coach : {teamsNoCoach.map((t) => t.name).join(", ")}</Alert>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-2xl font-bold">{isCoach ? `Bonjour ${profile.full_name.split(" ")[0]}` : "Tableau de bord"}</h1>
        <p className="text-sm text-dim">
          {isCoach
            ? myTeams.length > 0 ? `Tes équipes : ${myTeams.map((t) => t.name).join(", ")}` : "Aucune équipe ne t'est encore affectée."
            : "Vue d'ensemble de l'académie."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Joueurs actifs" value={active} />
        <StatCard label="Taux de présence" value={attendanceRate !== null ? `${attendanceRate}%` : "—"} hint={att.length === 0 ? "Fais l'appel sur une séance" : undefined} />
        <StatCard label="Séances (14 j)" value={upcomingMine.length} />
        <StatCard label="Blessés" value={injured.length} />
      </div>

      {alerts.length > 0 && (
        <div className="card">
          <h2 className="mb-3 font-semibold">À surveiller</h2>
          <ul className="space-y-1.5">{alerts}</ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Prochaines séances</h2>
            <Link href="/seances/calendrier" className="text-xs text-faint">Planning →</Link>
          </div>
          <SessionList rows={upcomingMine.slice(0, 6)} empty="Aucune séance dans les 14 prochains jours." />
        </div>
        <div className="card">
          <h2 className="mb-3 font-semibold">Appel à faire</h2>
          <SessionList rows={toCall.slice(0, 6) as Upcoming[]} empty="Tous les appels récents sont faits. 👍" />
        </div>
      </div>

      {att.length > 0 && (
        <div className="card">
          <h2 className="mb-3 font-semibold">Présence par mois</h2>
          <PresenceChart data={chart} />
        </div>
      )}

      <div className="card">
        <h2 className="mb-3 font-semibold">Accès rapides</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/joueurs" className="btn-secondary">Joueurs</Link>
          <Link href="/seances/nouvelle" className="btn-secondary">Nouvelle séance</Link>
          <Link href="/videos" className="btn-secondary">Vidéos</Link>
          <Link href="/rapports" className="btn-secondary">Rapports</Link>
        </div>
      </div>
    </div>
  );
}

async function PlayerDashboard(playerUserId: string) {
  const supabase = await createClient();
  const { data: player } = await supabase.from("players").select("id").eq("user_id", playerUserId).maybeSingle();
  if (!player) {
    return (
      <div className="card">
        <p>Aucune fiche joueur n&apos;est encore associée à ton compte. Contacte ton coach.</p>
      </div>
    );
  }
  return <PlayerSummary playerId={player.id} />;
}

export default async function DashboardPage() {
  const profile = await requireProfile();

  if (profile.role === "joueur") {
    return await PlayerDashboard(profile.id);
  }

  if (profile.role === "parent") {
    const supabase = await createClient();
    const { data: children } = await supabase.from("parent_player").select("player_id").eq("parent_id", profile.id);
    const ids = (children ?? []).map((c) => c.player_id);
    return (
      <div className="space-y-10">
        <h1 className="display text-2xl font-bold">{ids.length > 1 ? "Mes enfants" : "Mon enfant"}</h1>
        {ids.map((id) => <PlayerSummary key={id} playerId={id} />)}
        {ids.length === 0 && <div className="empty">Aucun enfant n&apos;est encore rattaché à ton compte. Demande à l&apos;administrateur de l&apos;académie.</div>}
      </div>
    );
  }

  // admin, directeur_sportif, coach, preparateur_physique
  return await DirectionDashboard(profile);
}
