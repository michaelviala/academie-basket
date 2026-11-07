import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateAge, getClubSettings, requireProfile, ROLE_LABELS } from "@/lib/data";
import { BrandingForm } from "@/components/branding-form";
import { PlayersImportToggle } from "@/components/players-import-toggle";
import { AdminTeams, type AdminTeam } from "@/components/admin-teams";
import { AdminUsers, type AdminUser } from "@/components/admin-users";
import { AdminCoaches, type AdminCoach } from "@/components/admin-coaches";
import { GymsManager } from "@/components/gyms-manager";
import { AdminPlayers, type AdminPlayer } from "@/components/admin-players";
import type { Guardian } from "@/lib/guardians";

const TABS = [
  { key: "joueurs", label: "Joueurs & parents" },
  { key: "equipes", label: "Catégories" },
  { key: "coachs", label: "Coachs" },
  { key: "utilisateurs", label: "Utilisateurs" },
  { key: "club", label: "Club & salles" },
  { key: "saisons", label: "Saisons & référentiel" },
] as const;

export default async function AdministrationPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { vue } = await searchParams;
  const profile = await requireProfile();
  if (profile.role !== "admin") notFound();
  const tab = TABS.find((t) => t.key === vue)?.key ?? "joueurs";
  const supabase = await createClient();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-2xl font-bold tracking-wide">ADMINISTRATION</h1>
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>Réservé aux administrateurs.</p>
      </div>

      <div className="seg" style={{ flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <Link key={t.key} href={t.key === "joueurs" ? "/administration" : `/administration?vue=${t.key}`} className={tab === t.key ? "active" : ""}>
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "joueurs" && <PlayersTab />}

      {tab === "equipes" && <TeamsTab />}

      {tab === "coachs" && <CoachsTab />}

      {tab === "utilisateurs" && <UsersTab />}

      {tab === "club" && <ClubTab />}

      {tab === "saisons" && <SeasonsTab />}
    </div>
  );

  async function PlayersTab() {
    const [{ data: rows }, { data: gRows }] = await Promise.all([
      supabase
        .from("players")
        .select("id, first_name, last_name, birth_date, status, jersey_number, teams(name, category)")
        .order("last_name"),
      supabase.from("player_guardians").select("id, player_id, full_name, relationship, email, phone, is_primary, notes"),
    ]);
    const players: AdminPlayer[] = (rows ?? []).map((p) => {
      const t = p.teams as { name: string; category: string } | null;
      return {
        id: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        birthDate: p.birth_date,
        age: calculateAge(p.birth_date),
        status: p.status,
        jersey: p.jersey_number,
        teamName: t?.name ?? null,
        category: t?.category ?? null,
      };
    });
    const guardians: Guardian[] = (gRows ?? []).map((g) => ({
      id: g.id,
      playerId: g.player_id,
      fullName: g.full_name,
      relationship: (["mere", "pere", "tuteur"].includes(g.relationship) ? g.relationship : "autre") as Guardian["relationship"],
      email: g.email ?? "",
      phone: g.phone ?? "",
      isPrimary: g.is_primary,
      notes: g.notes ?? "",
    }));
    return (
      <div className="space-y-2">
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>
          Tous les joueurs du club avec leurs parents ou responsables. Filtre par catégorie ou statut, repère les fiches sans parent, et exporte la liste en CSV.
          Ces données personnelles ne sont visibles que de la direction et des coachs de la catégorie concernée.
        </p>
        <PlayersImportToggle>
          <AdminPlayers key={`${players.length}-${guardians.length}`} players={players} guardians={guardians} />
        </PlayersImportToggle>
      </div>
    );
  }

  async function CoachsTab() {
    const [{ data: rows }, { data: teams }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, phone, role, team_coaches(teams(id, name, category))")
        .in("role", ["coach", "directeur_sportif", "preparateur_physique"])
        .order("full_name"),
      supabase.from("teams").select("id, name, category").order("name"),
    ]);
    const coaches: AdminCoach[] = (rows ?? []).map((c) => ({
      id: c.id,
      name: c.full_name,
      email: c.email,
      phone: c.phone,
      roleLabel: ROLE_LABELS[c.role] ?? c.role,
      teams: (c.team_coaches ?? []).map((tc) => tc.teams).filter((t): t is { id: string; name: string; category: string } => !!t),
    }));
    return <AdminCoaches coaches={coaches} teams={teams ?? []} canCreate={!!process.env.SUPABASE_SERVICE_ROLE_KEY} />;
  }

  async function TeamsTab() {
    const [{ data: teams }, { data: seasons }, { data: players }, { data: tc }] = await Promise.all([
      supabase.from("teams").select("id, name, category, season_id").order("category").order("name"),
      supabase.from("seasons").select("id, label, is_active").order("start_date", { ascending: false }),
      supabase.from("players").select("id, first_name, last_name, team_id").order("last_name"),
      supabase.from("team_coaches").select("team_id, profiles(full_name)"),
    ]);
    const rows: AdminTeam[] = (teams ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      seasonId: t.season_id,
      coaches: (tc ?? []).filter((r) => r.team_id === t.id).map((r) => (r.profiles as { full_name: string } | null)?.full_name ?? "").filter(Boolean),
      players: (players ?? []).filter((p) => p.team_id === t.id).map((p) => ({ id: p.id, name: `${p.first_name} ${p.last_name}` })),
    }));
    const unassigned = (players ?? []).filter((p) => !p.team_id).map((p) => ({ id: p.id, name: `${p.first_name} ${p.last_name}` }));
    return <AdminTeams teams={rows} seasons={seasons ?? []} unassigned={unassigned} />;
  }

  async function UsersTab() {
    const [{ data: profiles }, { data: players }, { data: links }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, role").order("full_name"),
      supabase.from("players").select("id, first_name, last_name, user_id").order("last_name"),
      supabase.from("parent_player").select("parent_id, player_id"),
    ]);
    const users: AdminUser[] = (profiles ?? []).map((p) => ({
      id: p.id,
      name: p.full_name,
      email: p.email,
      role: p.role,
      linkedPlayerId: (players ?? []).find((pl) => pl.user_id === p.id)?.id ?? null,
      children: (links ?? []).filter((l) => l.parent_id === p.id).map((l) => l.player_id),
    }));
    const opts = (players ?? []).map((p) => ({ id: p.id, name: `${p.first_name} ${p.last_name}`, userId: p.user_id }));
    return <AdminUsers users={users} players={opts} roles={ROLE_LABELS} meId={profile.id} />;
  }

  async function ClubTab() {
    const [{ data: gyms }, settings] = await Promise.all([supabase.from("gyms").select("id, name, address, courts, notes").order("name"), getClubSettings()]);
    return (
      <div className="space-y-6">
        <BrandingForm
          currentLogoUrl={settings.logo_url}
          currentColor={settings.brand_color}
          currentBgColor={settings.bg_color}
          currentSidebarColor={settings.sidebar_color}
        />
        <GymsManager initialGyms={gyms ?? []} />
      </div>
    );
  }

  async function SeasonsTab() {
    const [{ data: seasons }, { data: skillsCount }] = await Promise.all([
      supabase.from("seasons").select("id, label, start_date, end_date, is_active").order("start_date", { ascending: false }),
      supabase.from("skills").select("category"),
    ]);
    const skillsByCategory = (skillsCount ?? []).reduce<Record<string, number>>((acc, s) => {
      acc[s.category] = (acc[s.category] ?? 0) + 1;
      return acc;
    }, {});
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Saisons</h2>
          {seasons?.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm">
              <span>{s.label} ({s.start_date} → {s.end_date})</span>
              {s.is_active && (
                <span className="badge" style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80", borderColor: "transparent" }}>Active</span>
              )}
            </div>
          ))}
        </div>
        <div className="card">
          <h2 className="mb-3 font-semibold">Référentiel de compétences</h2>
          {Object.entries(skillsByCategory).map(([cat, count]) => (
            <div key={cat} className="flex items-center justify-between text-sm">
              <span className="capitalize">{cat}</span>
              <span style={{ color: "var(--text-faint)" }}>{count} compétences</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
}
