import { createClient } from "@/lib/supabase/server";
import { getClubSettings } from "@/lib/data";
import { BrandingForm } from "@/components/branding-form";

export default async function AdministrationPage() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: seasons }, { data: skillsCount }, settings] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role").order("full_name"),
    supabase.from("seasons").select("id, label, start_date, end_date, is_active").order("start_date", { ascending: false }),
    supabase.from("skills").select("category"),
    getClubSettings(),
  ]);

  const skillsByCategory = (skillsCount ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-2xl font-bold tracking-wide">ADMINISTRATION</h1>
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>
          Réservé aux administrateurs. La gestion fine des rôles se fait pour l&apos;instant depuis Supabase (table{" "}
          <code>profiles</code>).
        </p>
      </div>

      <BrandingForm currentLogoUrl={settings.logo_url} currentColor={settings.brand_color} />

      <div className="card">
        <h2 className="mb-3 font-semibold">Utilisateurs</h2>
        <div className="space-y-1">
          {profiles?.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span>
                {p.full_name} <span style={{ color: "var(--text-faint)" }}>({p.email})</span>
              </span>
              <span className="badge">{p.role}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Saisons</h2>
          {seasons?.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm">
              <span>
                {s.label} ({s.start_date} → {s.end_date})
              </span>
              {s.is_active && (
                <span
                  className="badge"
                  style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80", borderColor: "transparent" }}
                >
                  Active
                </span>
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
    </div>
  );
}
