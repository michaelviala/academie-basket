import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, calculateAge } from "@/lib/data";

const STATUS_LABELS: Record<string, string> = {
  actif: "Actif",
  inactif: "Inactif",
  blesse: "Blessé",
  parti: "Parti",
};

const STATUS_COLORS: Record<string, string> = {
  actif: "bg-emerald-100 text-emerald-700",
  inactif: "bg-slate-100 text-slate-600",
  blesse: "bg-red-100 text-red-700",
  parti: "bg-slate-100 text-slate-500",
};

export default async function JoueursPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; team?: string }>;
}) {
  const profile = await requireProfile();
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("players")
    .select("id, first_name, last_name, photo_url, birth_date, primary_position, jersey_number, status, teams(name, category)")
    .order("last_name");

  if (q) {
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
  }

  const { data: players } = await query;

  const canCreate = ["admin", "directeur_sportif", "coach"].includes(profile.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Joueurs</h1>
          <p className="text-sm text-slate-500">{players?.length ?? 0} joueur(s)</p>
        </div>
        {canCreate && (
          <Link href="/joueurs/nouveau" className="btn-primary">+ Nouveau joueur</Link>
        )}
      </div>

      <form className="card flex gap-3">
        <input
          className="input"
          type="text"
          name="q"
          placeholder="Rechercher un joueur..."
          defaultValue={q}
        />
        <button className="btn-secondary" type="submit">Rechercher</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players?.map((p) => (
          <Link
            key={p.id}
            href={`/joueurs/${p.id}`}
            className="card flex items-center gap-3 hover:border-orange-300"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-500">
              {p.first_name[0]}
              {p.last_name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.first_name} {p.last_name}</p>
              <p className="truncate text-xs text-slate-400">
                {p.teams?.name ?? "Sans équipe"} · {calculateAge(p.birth_date)} ans
                {p.jersey_number ? ` · #${p.jersey_number}` : ""}
              </p>
            </div>
            <span className={`badge ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</span>
          </Link>
        ))}
        {(!players || players.length === 0) && (
          <p className="text-sm text-slate-400">Aucun joueur trouvé.</p>
        )}
      </div>
    </div>
  );
}
