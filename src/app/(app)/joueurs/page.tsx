import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, calculateAge } from "@/lib/data";
import { getCategoryColors } from "@/lib/technical-guide-data";
import {
  attendanceRate,
  categoryColor,
  daysSince,
  globalAverage,
  typeAverages,
  type EvalRow,
} from "@/lib/player-stats";
import { PlayersBrowser, type PlayerRow } from "@/components/players-browser";

export default async function JoueursPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const profile = await requireProfile();
  const { q, category, sort } = await searchParams;
  const sortKey = sort === "moyenne" || sort === "age" ? sort : "nom";
  const supabase = await createClient();

  const query = supabase
    .from("players")
    .select(
      "id, first_name, last_name, photo_url, birth_date, primary_position, jersey_number, status, teams(name, category)",
    )
    .order("last_name");

  const [
    { data: allPlayers },
    { data: evals },
    { data: attendanceRows },
    { data: goals },
    colors,
  ] = await Promise.all([
    query,
    supabase
      .from("evaluations")
      .select("player_id, evaluation_type, score, evaluated_at"),
    supabase.from("attendance").select("player_id, status"),
    supabase.from("goals").select("player_id, status"),
    getCategoryColors(),
  ]);

  // Regroupement par joueur
  const evalsBy = new Map<string, (EvalRow & { evaluated_at: string })[]>();
  evals?.forEach((e) =>
    evalsBy.set(e.player_id, [...(evalsBy.get(e.player_id) ?? []), e]),
  );
  const attBy = new Map<string, string[]>();
  attendanceRows?.forEach((a) =>
    attBy.set(a.player_id, [...(attBy.get(a.player_id) ?? []), a.status]),
  );
  const goalsBy = new Map<string, number>();
  goals?.forEach((g) => {
    if (g.status === "en_cours")
      goalsBy.set(g.player_id, (goalsBy.get(g.player_id) ?? 0) + 1);
  });

  const rows: PlayerRow[] = (allPlayers ?? []).map((p) => {
    const ev = evalsBy.get(p.id) ?? [];
    const lastEval = ev.reduce<string | null>(
      (m, e) => (m === null || e.evaluated_at > m ? e.evaluated_at : m),
      null,
    );
    return {
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      photo_url: p.photo_url,
      birth_date: p.birth_date,
      age: calculateAge(p.birth_date),
      primary_position: p.primary_position,
      jersey_number: p.jersey_number,
      status: p.status,
      category: p.teams?.category ?? null,
      avg: globalAverage(ev),
      byType: typeAverages(ev),
      att: attendanceRate(attBy.get(p.id) ?? []),
      lastEvalDays: daysSince(lastEval),
      goalsInProgress: goalsBy.get(p.id) ?? 0,
      color: categoryColor(colors, p.teams?.category),
    };
  });

  const canCreate = ["admin", "directeur_sportif", "coach"].includes(
    profile.role,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-3xl font-bold uppercase">Joueurs</h1>
          <p className="text-sm" style={{ color: "var(--text-faint)" }}>
            Suivi de la progression de chaque joueur de l&apos;académie.
          </p>
        </div>
        {canCreate && (
          <Link href="/joueurs/nouveau" className="btn-primary">
            + Nouveau joueur
          </Link>
        )}
      </div>

      <PlayersBrowser
        rows={rows}
        colors={colors}
        canCreate={canCreate}
        initialQ={q ?? ""}
        initialCategory={category ?? null}
        initialSort={sortKey}
      />
    </div>
  );
}
