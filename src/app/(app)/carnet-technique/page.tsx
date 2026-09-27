import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { calculateAge } from "@/lib/data";

export default async function CarnetTechniqueIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("players")
    .select("id, first_name, last_name, photo_url, birth_date, teams(name, category)")
    .order("last_name");

  if (q) {
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
  }

  const { data: players } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-2xl font-bold">Carnet technique</h1>
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>
          Choisis un joueur pour voir ses apprentissages enregistrés, regroupés par catégorie de compétence.
        </p>
      </div>

      <form className="card flex gap-3">
        <input className="input" type="text" name="q" placeholder="Rechercher un joueur..." defaultValue={q} />
        <button className="btn-secondary" type="submit">Rechercher</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players?.map((p) => (
          <Link
            key={p.id}
            href={`/carnet-technique/${p.id}`}
            className="card flex items-center gap-3"
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
              <p className="truncate text-xs" style={{ color: "var(--text-faint)" }}>
                {p.teams?.name ?? "Sans équipe"} · {calculateAge(p.birth_date)} ans
              </p>
            </div>
          </Link>
        ))}
        {(!players || players.length === 0) && (
          <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucun joueur trouvé.</p>
        )}
      </div>
    </div>
  );
}
