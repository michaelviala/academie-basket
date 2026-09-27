import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { createTeam, createSeason } from "./actions";

export default async function EquipesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: teams }, { data: seasons }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, category, seasons(label), players(id)")
      .order("name"),
    supabase.from("seasons").select("id, label, is_active").order("start_date", { ascending: false }),
  ]);

  const canManage = ["admin", "directeur_sportif"].includes(profile.role);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Équipes</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams?.map((t) => (
          <div key={t.id} className="card">
            <p className="font-semibold">{t.name}</p>
            <p className="text-xs text-slate-400">{t.category} · {t.seasons?.label ?? "—"}</p>
            <p className="mt-2 text-sm text-slate-500">{t.players?.length ?? 0} joueur(s)</p>
          </div>
        ))}
        {(!teams || teams.length === 0) && <p className="text-sm text-slate-400">Aucune équipe.</p>}
      </div>

      {canManage && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form action={createTeam} className="card space-y-3">
            <h2 className="font-semibold">Nouvelle équipe</h2>
            <input className="input" name="name" placeholder="Nom de l'équipe" required />
            <input className="input" name="category" placeholder="Catégorie (U13, Seniors...)" required />
            <select className="input" name="season_id" required defaultValue="">
              <option value="" disabled>Saison</option>
              {seasons?.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <button className="btn-primary" type="submit">Créer</button>
          </form>

          <form action={createSeason} className="card space-y-3">
            <h2 className="font-semibold">Nouvelle saison</h2>
            <input className="input" name="label" placeholder="ex : 2026-2027" required />
            <div className="grid grid-cols-2 gap-3">
              <input className="input" type="date" name="start_date" required />
              <input className="input" type="date" name="end_date" required />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_active" /> Saison active
            </label>
            <button className="btn-primary" type="submit">Créer</button>
          </form>
        </div>
      )}
    </div>
  );
}
