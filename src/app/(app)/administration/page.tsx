import { createClient } from "@/lib/supabase/server";

export default async function AdministrationPage() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: seasons }, { data: skillsCount }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role").order("full_name"),
    supabase.from("seasons").select("id, label, start_date, end_date, is_active").order("start_date", { ascending: false }),
    supabase.from("skills").select("category"),
  ]);

  const skillsByCategory = (skillsCount ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Administration</h1>
        <p className="text-sm text-slate-500">
          Réservé aux administrateurs. La gestion fine des rôles se fait pour l&apos;instant depuis Supabase (table <code>profiles</code>).
        </p>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Utilisateurs</h2>
        <div className="space-y-1">
          {profiles?.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span>{p.full_name} <span className="text-slate-400">({p.email})</span></span>
              <span className="badge bg-slate-100 text-slate-600">{p.role}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Saisons</h2>
          {seasons?.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm">
              <span>{s.label} ({s.start_date} → {s.end_date})</span>
              {s.is_active && <span className="badge bg-emerald-100 text-emerald-700">Active</span>}
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Référentiel de compétences</h2>
          {Object.entries(skillsByCategory).map(([cat, count]) => (
            <div key={cat} className="flex items-center justify-between text-sm">
              <span className="capitalize">{cat}</span>
              <span className="text-slate-400">{count} compétences</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
