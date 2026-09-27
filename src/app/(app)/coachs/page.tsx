import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, ROLE_LABELS } from "@/lib/data";

const COACH_ROLES = ["coach", "directeur_sportif", "preparateur_physique"] as const;

export default async function CoachsPage() {
  const profile = await requireProfile();
  if (!["admin", "directeur_sportif"].includes(profile.role)) notFound();

  const supabase = await createClient();

  const { data: coaches } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, avatar_url, role, team_coaches(teams(name))")
    .in("role", COACH_ROLES)
    .order("full_name");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Coachs</h1>
          <p className="text-sm" style={{ color: "var(--text-faint)" }}>
            Fiche, équipes entraînées et créneaux de chaque coach.
          </p>
        </div>
        <Link href="/coachs/nouveau" className="btn-primary">+ Nouveau coach</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {coaches?.map((c) => (
          <Link key={c.id} href={`/coachs/${c.id}`} className="card flex items-center gap-3">
            <div
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold"
              style={{ background: "var(--surf-2)", color: "var(--text-dim)" }}
            >
              {c.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                c.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{c.full_name}</p>
              <p className="truncate text-xs" style={{ color: "var(--text-faint)" }}>
                {ROLE_LABELS[c.role]} · {c.team_coaches?.length ?? 0} équipe(s)
              </p>
            </div>
          </Link>
        ))}
        {(!coaches || coaches.length === 0) && (
          <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucun coach pour l&apos;instant.</p>
        )}
      </div>
    </div>
  );
}
