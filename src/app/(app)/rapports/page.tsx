import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function RapportsPage() {
  const supabase = await createClient();
  const { data: players } = await supabase
    .from("players")
    .select("id, first_name, last_name, teams(name)")
    .order("last_name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rapports</h1>
        <p className="text-sm text-dim">
          Rapport individuel consultable et imprimable (export PDF prévu en V2) depuis la fiche joueur 360°.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players?.map((p) => (
          <Link key={p.id} href={`/joueurs/${p.id}`} className="card">
            <p className="font-semibold">{p.first_name} {p.last_name}</p>
            <p className="text-xs text-faint">{p.teams?.name ?? "Sans catégorie"} · Voir la fiche complète →</p>
          </Link>
        ))}
        {(!players || players.length === 0) && <p className="text-sm text-faint">Aucun joueur.</p>}
      </div>
    </div>
  );
}
