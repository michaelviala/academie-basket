import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { createMatch } from "./actions";

export default async function MatchsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: matches }, { data: teams }] = await Promise.all([
    supabase.from("matches").select("*, teams(name)").order("date", { ascending: false }).limit(30),
    supabase.from("teams").select("id, name").order("name"),
  ]);

  const canManage = ["admin", "directeur_sportif", "coach"].includes(profile.role);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Matchs</h1>

      {canManage && (
        <form action={createMatch} className="card grid gap-3 sm:grid-cols-2">
          <h2 className="col-span-2 font-semibold">Nouveau match</h2>
          <input className="input" name="opponent" placeholder="Adversaire" required />
          <input className="input" type="date" name="date" required />
          <input className="input" name="competition" placeholder="Compétition" />
          <select className="input" name="home_away" defaultValue="domicile">
            <option value="domicile">Domicile</option>
            <option value="exterieur">Extérieur</option>
          </select>
          <select className="input" name="team_id" required defaultValue="">
            <option value="" disabled>Équipe</option>
            {teams?.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <div className="flex gap-3">
            <input className="input" type="number" name="score_us" placeholder="Score académie" />
            <input className="input" type="number" name="score_them" placeholder="Score adverse" />
          </div>
          <button className="btn-primary sm:col-span-2" type="submit">Ajouter le match</button>
        </form>
      )}

      <div className="space-y-2">
        {matches?.map((m) => (
          <div key={m.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium">{m.teams?.name ?? "Équipe"} vs {m.opponent}</p>
              <p className="text-xs text-slate-400">{m.date} · {m.home_away} · {m.competition ?? "—"}</p>
            </div>
            {(m.score_us !== null && m.score_them !== null) && (
              <span className="badge bg-slate-100 text-slate-700">{m.score_us} - {m.score_them}</span>
            )}
          </div>
        ))}
        {(!matches || matches.length === 0) && <p className="text-sm text-slate-400">Aucun match enregistré.</p>}
      </div>
    </div>
  );
}
