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
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const profile = await requireProfile();
  const { q, category } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("players")
    .select("id, first_name, last_name, photo_url, birth_date, primary_position, jersey_number, status, teams(name, category)")
    .order("last_name");

  if (q) {
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
  }

  const { data: allPlayers } = await query;

  // Catégories disponibles (dérivées des équipes), avec le nombre de joueurs dans chacune
  const categoryCounts = new Map<string, number>();
  allPlayers?.forEach((p) => {
    const cat = p.teams?.category ?? "Sans catégorie";
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  });
  const categories = Array.from(categoryCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  const players = category
    ? allPlayers?.filter((p) => (p.teams?.category ?? "Sans catégorie") === category)
    : allPlayers;

  const qParam = q ? `q=${encodeURIComponent(q)}` : "";

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

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/joueurs${qParam ? `?${qParam}` : ""}`}
          className="rounded-full px-3 py-1.5 text-xs font-medium"
          style={{
            background: !category ? "var(--brand)" : "var(--surf-2)",
            color: !category ? "#fff" : "var(--text-dim)",
            border: "1px solid var(--border)",
          }}
        >
          Toutes ({allPlayers?.length ?? 0})
        </Link>
        {categories.map(([cat, count]) => (
          <Link
            key={cat}
            href={`/joueurs?${qParam ? `${qParam}&` : ""}category=${encodeURIComponent(cat)}`}
            className="rounded-full px-3 py-1.5 text-xs font-medium"
            style={{
              background: category === cat ? "var(--brand)" : "var(--surf-2)",
              color: category === cat ? "#fff" : "var(--text-dim)",
              border: "1px solid var(--border)",
            }}
          >
            {cat} ({count})
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players?.map((p) => (
          <Link
            key={p.id}
            href={`/joueurs/${p.id}`}
            className="card flex items-center gap-3 hover:border-orange-300"
          >
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-bold"
              style={{ background: "var(--surf-2)", color: "var(--text-dim)" }}
            >
              {p.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <>
                  {p.first_name[0]}
                  {p.last_name[0]}
                </>
              )}
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
