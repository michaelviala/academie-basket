import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const SKILL_CATEGORY_ORDER = [
  "tir",
  "dribble",
  "finition",
  "passe",
  "defense",
  "rebond",
  "tactique",
  "physique",
  "mental",
] as const;

const SKILL_CATEGORY_LABELS: Record<string, string> = {
  tir: "Tir",
  dribble: "Dribble",
  finition: "Finition",
  passe: "Passe",
  defense: "Défense",
  rebond: "Rebond",
  tactique: "Tactique",
  physique: "Physique",
  mental: "Mental",
};

export default async function CarnetTechniquePlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: player } = await supabase
    .from("players")
    .select("id, first_name, last_name, photo_url, teams(name, category)")
    .eq("id", id)
    .maybeSingle();

  if (!player) notFound();

  const { data: evaluations } = await supabase
    .from("evaluations")
    .select("id, score, comment, evaluated_at, skills(name, category)")
    .eq("player_id", id)
    .order("evaluated_at", { ascending: false });

  type LogbookEntry = {
    id: string;
    skillName: string;
    score: number;
    comment: string | null;
    evaluated_at: string;
  };
  const logbookByCategory = new Map<string, LogbookEntry[]>();
  evaluations?.forEach((e) => {
    if (!e.skills) return;
    const category = e.skills.category;
    const list = logbookByCategory.get(category) ?? [];
    list.push({ id: e.id, skillName: e.skills.name, score: Number(e.score), comment: e.comment, evaluated_at: e.evaluated_at });
    logbookByCategory.set(category, list);
  });

  return (
    <div className="space-y-6">
      <Link href="/carnet-technique" className="text-xs" style={{ color: "var(--text-faint)" }}>
        ← Retour au carnet technique
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-bold"
            style={{ background: "var(--surf-2)", color: "var(--text-dim)" }}
          >
            {player.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <>
                {player.first_name[0]}
                {player.last_name[0]}
              </>
            )}
          </div>
          <div>
            <h1 className="display text-2xl font-bold">Carnet technique — {player.first_name} {player.last_name}</h1>
            <p className="text-sm" style={{ color: "var(--text-faint)" }}>{player.teams?.name ?? "Sans équipe"}</p>
          </div>
        </div>
        <Link href={`/joueurs/${player.id}`} className="btn-secondary">Voir la fiche complète</Link>
      </div>

      <div className="card">
        <p className="mb-4 text-xs" style={{ color: "var(--text-faint)" }}>
          Apprentissages enregistrés, regroupés par catégorie de compétence.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SKILL_CATEGORY_ORDER.filter((cat) => logbookByCategory.has(cat)).map((cat) => (
            <div key={cat} className="rounded-lg p-3" style={{ background: "var(--surf-2)" }}>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
                {SKILL_CATEGORY_LABELS[cat]}
              </p>
              <div className="space-y-2">
                {logbookByCategory.get(cat)!.map((entry) => (
                  <div key={entry.id} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{entry.skillName}</span>
                      <span className="badge" style={{ background: "rgba(255,106,31,0.14)", color: "var(--text)", borderColor: "transparent" }}>
                        {entry.score}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                      {entry.evaluated_at}
                      {entry.comment ? ` · ${entry.comment}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {logbookByCategory.size === 0 && (
            <p className="text-sm" style={{ color: "var(--text-faint)" }}>
              Aucun apprentissage enregistré pour l&apos;instant. Lie une évaluation à une compétence pour l&apos;ajouter ici.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
