import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, calculateAge } from "@/lib/data";
import { getCategoryColors } from "@/lib/technical-guide-data";
import {
  EVAL_COLORS,
  EVAL_LABELS,
  EVAL_SHORT,
  EVAL_TYPES,
  agoLabel,
  attendanceRate,
  categoryColor,
  daysSince,
  globalAverage,
  scoreColor,
  tint,
  typeAverages,
  type EvalRow,
} from "@/lib/player-stats";

const STATUS_LABELS: Record<string, string> = { actif: "Actif", inactif: "Inactif", blesse: "Blessé", parti: "Parti" };
const STATUS_COLORS: Record<string, string> = {
  actif: "var(--green)",
  inactif: "var(--text-faint)",
  blesse: "var(--red)",
  parti: "var(--text-faint)",
};

const SORTS = [
  { key: "nom", label: "Nom" },
  { key: "moyenne", label: "Moyenne" },
  { key: "age", label: "Âge" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

const STALE_DAYS = 60;

export default async function JoueursPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const profile = await requireProfile();
  const { q, category, sort } = await searchParams;
  const sortKey: SortKey = SORTS.some((s) => s.key === sort) ? (sort as SortKey) : "nom";
  const supabase = await createClient();

  let query = supabase
    .from("players")
    .select("id, first_name, last_name, photo_url, birth_date, primary_position, jersey_number, status, teams(name, category)")
    .order("last_name");
  if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);

  const [{ data: allPlayers }, { data: evals }, { data: attendanceRows }, { data: goals }, colors] = await Promise.all([
    query,
    supabase.from("evaluations").select("player_id, evaluation_type, score, evaluated_at"),
    supabase.from("attendance").select("player_id, status"),
    supabase.from("goals").select("player_id, status"),
    getCategoryColors(),
  ]);

  // Regroupement par joueur
  const evalsBy = new Map<string, (EvalRow & { evaluated_at: string })[]>();
  evals?.forEach((e) => evalsBy.set(e.player_id, [...(evalsBy.get(e.player_id) ?? []), e]));
  const attBy = new Map<string, string[]>();
  attendanceRows?.forEach((a) => attBy.set(a.player_id, [...(attBy.get(a.player_id) ?? []), a.status]));
  const goalsBy = new Map<string, number>();
  goals?.forEach((g) => {
    if (g.status === "en_cours") goalsBy.set(g.player_id, (goalsBy.get(g.player_id) ?? 0) + 1);
  });

  const rows = (allPlayers ?? []).map((p) => {
    const ev = evalsBy.get(p.id) ?? [];
    const lastEval = ev.reduce<string | null>((m, e) => (m === null || e.evaluated_at > m ? e.evaluated_at : m), null);
    return {
      p,
      avg: globalAverage(ev),
      byType: typeAverages(ev),
      att: attendanceRate(attBy.get(p.id) ?? []),
      lastEvalDays: daysSince(lastEval),
      goalsInProgress: goalsBy.get(p.id) ?? 0,
      color: categoryColor(colors, p.teams?.category),
    };
  });

  // Catégories disponibles (dérivées des équipes), avec le nombre de joueurs
  const categoryCounts = new Map<string, number>();
  rows.forEach(({ p }) => {
    const cat = p.teams?.category ?? "Sans catégorie";
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  });
  const categories = Array.from(categoryCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  const shown = rows
    .filter(({ p }) => !category || (p.teams?.category ?? "Sans catégorie") === category)
    .sort((a, b) => {
      if (sortKey === "moyenne") return (b.avg ?? -1) - (a.avg ?? -1);
      if (sortKey === "age") return a.p.birth_date < b.p.birth_date ? -1 : 1;
      return 0; // déjà trié par nom
    });

  // Bandeau d'indicateurs (sur la sélection affichée)
  const avgs = shown.map((r) => r.avg).filter((v): v is number => v !== null);
  const atts = shown.map((r) => r.att).filter((v): v is number => v !== null);
  const stale = shown.filter((r) => r.lastEvalDays === null || r.lastEvalDays > STALE_DAYS).length;
  const goalsTotal = shown.reduce((s, r) => s + r.goalsInProgress, 0);
  const kpis = [
    { label: "Joueurs", value: String(shown.length), hint: category ?? "Toutes catégories" },
    { label: "Moyenne globale", value: avgs.length ? (avgs.reduce((s, v) => s + v, 0) / avgs.length).toFixed(1) : "—", hint: "sur 10" },
    { label: "Présence moyenne", value: atts.length ? `${Math.round(atts.reduce((s, v) => s + v, 0) / atts.length)}%` : "—", hint: "aux entraînements" },
    { label: "À réévaluer", value: String(stale), hint: `sans évaluation depuis ${STALE_DAYS} j`, warn: stale > 0 },
    { label: "Objectifs en cours", value: String(goalsTotal), hint: "tous joueurs" },
  ];

  const canCreate = ["admin", "directeur_sportif", "coach"].includes(profile.role);
  const href = (params: { q?: string; category?: string; sort?: string }) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.category) sp.set("category", params.category);
    if (params.sort && params.sort !== "nom") sp.set("sort", params.sort);
    const s = sp.toString();
    return `/joueurs${s ? `?${s}` : ""}`;
  };

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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="kpi">
            <p className="kpi-value" style={{ color: k.warn ? "var(--amber)" : undefined }}>
              {k.value}
            </p>
            <p className="kpi-label">{k.label}</p>
            <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-faint)" }}>
              {k.hint}
            </p>
          </div>
        ))}
      </div>

      <form className="card flex flex-wrap gap-3">
        {category && <input type="hidden" name="category" value={category} />}
        {sortKey !== "nom" && <input type="hidden" name="sort" value={sortKey} />}
        <input className="input min-w-0 flex-1" type="text" name="q" placeholder="Rechercher un joueur..." defaultValue={q} />
        <button className="btn-secondary" type="submit">
          Rechercher
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href={href({ q, sort: sortKey })}
            className="rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{
              background: !category ? "var(--brand)" : "var(--surf-2)",
              color: !category ? "#fff" : "var(--text-dim)",
              border: "1px solid var(--border)",
            }}
          >
            Toutes ({rows.length})
          </Link>
          {categories.map(([cat, count]) => {
            const c = categoryColor(colors, cat);
            const active = category === cat;
            return (
              <Link
                key={cat}
                href={href({ q, category: cat, sort: sortKey })}
                className="rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: active ? tint(c, 22) : "var(--surf-2)",
                  color: active ? "var(--text)" : "var(--text-dim)",
                  border: `1px solid ${active ? c : "var(--border)"}`,
                }}
              >
                <span style={{ color: c }}>●</span> {cat} ({count})
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-faint)" }}>
          Trier par
          <div className="seg">
            {SORTS.map((s) => (
              <Link key={s.key} href={href({ q, category, sort: s.key })} className={`rounded-full px-3 py-1 text-xs font-semibold ${sortKey === s.key ? "active" : ""}`} style={sortKey === s.key ? { background: "var(--brand)", color: "#fff" } : { color: "var(--text-faint)" }}>
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          <p className="display text-xl font-bold uppercase" style={{ color: "var(--text-dim)" }}>
            Aucun joueur trouvé
          </p>
          <p className="mt-1 text-sm">
            {q || category ? "Essaie d'élargir la recherche ou le filtre." : "Ajoute ton premier joueur pour commencer le suivi."}
          </p>
          {canCreate && !q && !category && (
            <Link href="/joueurs/nouveau" className="btn-primary mt-4">
              + Nouveau joueur
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map(({ p, avg, byType, att, lastEvalDays, goalsInProgress, color }) => {
            const staleEval = lastEvalDays === null || lastEvalDays > STALE_DAYS;
            return (
              <Link
                key={p.id}
                href={`/joueurs/${p.id}`}
                className="card group relative flex flex-col gap-4 overflow-hidden transition-transform hover:-translate-y-0.5"
                style={{ borderTop: `3px solid ${color}` }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-bold"
                    style={{ background: tint(color, 16), color, boxShadow: `0 0 0 2px ${tint(color, 55)}` }}
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
                    <p className="display truncate text-xl font-bold leading-tight">
                      {p.first_name} {p.last_name}
                    </p>
                    <p className="truncate text-xs" style={{ color: "var(--text-faint)" }}>
                      {p.jersey_number ? `#${p.jersey_number} · ` : ""}
                      {p.primary_position ?? "Poste non défini"} · {calculateAge(p.birth_date)} ans
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="chip" style={{ background: tint(color, 16), color, borderColor: tint(color, 45) }}>
                        {p.teams?.category ?? "—"}
                      </span>
                      {p.status !== "actif" && (
                        <span className="chip" style={{ color: STATUS_COLORS[p.status], borderColor: tint(STATUS_COLORS[p.status], 50) }}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="display text-3xl font-bold leading-none" style={{ color: scoreColor(avg) }}>
                      {avg !== null ? avg.toFixed(1) : "—"}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
                      Moy.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {EVAL_TYPES.map((t) => {
                    const v = byType[t];
                    return (
                      <div key={t} className="flex items-center gap-2" title={EVAL_LABELS[t]}>
                        <span className="w-8 text-[10px] font-bold tracking-widest" style={{ color: "var(--text-faint)" }}>
                          {EVAL_SHORT[t]}
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--surf-2)" }}>
                          <div className="h-full rounded-full" style={{ width: `${v !== null ? Math.min(100, v * 10) : 0}%`, background: EVAL_COLORS[t] }} />
                        </div>
                        <span className="w-7 text-right text-xs font-semibold tabular-nums">{v !== null ? v.toFixed(1) : "—"}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-[11px]" style={{ borderColor: "var(--border)", color: "var(--text-faint)" }}>
                  <span>
                    Présence{" "}
                    <strong style={{ color: att !== null && att < 70 ? "var(--amber)" : "var(--text)" }}>{att !== null ? `${att}%` : "—"}</strong>
                  </span>
                  <span>
                    <strong style={{ color: "var(--text)" }}>{goalsInProgress}</strong> objectif{goalsInProgress > 1 ? "s" : ""} en cours
                  </span>
                  <span style={{ color: staleEval ? "var(--amber)" : undefined }}>{agoLabel(lastEvalDays)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
