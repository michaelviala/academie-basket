import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateAge, getClubSettings, requireProfile, ROLE_LABELS } from "@/lib/data";
import { BrandingForm } from "@/components/branding-form";
import { GymsManager } from "@/components/gyms-manager";
import { AdminPlayers, type AdminPlayer } from "@/components/admin-players";
import type { Guardian } from "@/lib/guardians";

const TABS = [
  { key: "joueurs", label: "Joueurs & parents" },
  { key: "utilisateurs", label: "Utilisateurs" },
  { key: "club", label: "Club & gymnases" },
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
          Tous les joueurs du club avec leurs parents ou responsables. Filtre par catégorie, équipe ou statut, repère les fiches sans parent, et exporte la liste en CSV.
          Ces données personnelles ne sont visibles que de la direction et des coachs de l&apos;équipe concernée.
        </p>
        <AdminPlayers players={players} guardians={guardians} />
      </div>
    );
  }

  async function UsersTab() {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, email, role").order("full_name");
    return (
      <div className="card">
        <h2 className="mb-1 font-semibold">Utilisateurs ({profiles?.length ?? 0})</h2>
        <p className="mb-3 text-xs" style={{ color: "var(--text-faint)" }}>
          Comptes de connexion. La gestion fine des rôles se fait pour l&apos;instant depuis Supabase (table <code>profiles</code>).
        </p>
        <div className="space-y-1">
          {profiles?.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                {p.full_name} <span style={{ color: "var(--text-faint)" }}>({p.email})</span>
              </span>
              <span className="badge">{ROLE_LABELS[p.role] ?? p.role}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  async function ClubTab() {
    const [{ data: gyms }, settings] = await Promise.all([supabase.from("gyms").select("id, name, address").order("name"), getClubSettings()]);
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
