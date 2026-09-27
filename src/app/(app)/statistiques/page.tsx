import { createClient } from "@/lib/supabase/server";

export default async function StatistiquesPage({
  searchParams,
}: {
  searchParams: Promise<{ player?: string }>;
}) {
  const { player } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("player_match_stats")
    .select("*, players(first_name, last_name), matches(opponent, date)")
    .order("id", { ascending: false })
    .limit(50);

  if (player) query = query.eq("player_id", player);

  const { data: stats } = await query;
  const { data: players } = await supabase.from("players").select("id, first_name, last_name").order("last_name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Statistiques</h1>

      <form className="card flex flex-wrap items-center gap-3">
        <select className="input max-w-xs" name="player" defaultValue={player ?? ""}>
          <option value="">Tous les joueurs</option>
          {players?.map((p) => (
            <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
          ))}
        </select>
        <button className="btn-secondary" type="submit">Filtrer</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
              <th className="py-2 pr-3">Joueur</th>
              <th className="py-2 pr-3">Match</th>
              <th className="py-2 pr-3">Min</th>
              <th className="py-2 pr-3">Pts</th>
              <th className="py-2 pr-3">Reb</th>
              <th className="py-2 pr-3">Pss</th>
              <th className="py-2 pr-3">Int</th>
              <th className="py-2 pr-3">Ctr</th>
              <th className="py-2 pr-3">BP</th>
              <th className="py-2 pr-3">+/-</th>
            </tr>
          </thead>
          <tbody>
            {stats?.map((s) => (
              <tr key={s.id} className="border-b border-slate-100">
                <td className="py-2 pr-3">{s.players?.first_name} {s.players?.last_name}</td>
                <td className="py-2 pr-3 text-slate-400">vs {s.matches?.opponent} ({s.matches?.date})</td>
                <td className="py-2 pr-3">{s.minutes}</td>
                <td className="py-2 pr-3 font-semibold">{s.points}</td>
                <td className="py-2 pr-3">{s.total_reb}</td>
                <td className="py-2 pr-3">{s.assists}</td>
                <td className="py-2 pr-3">{s.steals}</td>
                <td className="py-2 pr-3">{s.blocks}</td>
                <td className="py-2 pr-3">{s.turnovers}</td>
                <td className="py-2 pr-3">{s.plus_minus}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!stats || stats.length === 0) && <p className="py-4 text-sm text-slate-400">Aucune statistique enregistrée.</p>}
      </div>
    </div>
  );
}
