"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  EVAL_COLORS,
  EVAL_LABELS,
  EVAL_SHORT,
  EVAL_TYPES,
  agoLabel,
  scoreColor,
  tint,
  type EvalType,
} from "@/lib/player-stats";

export type PlayerRow = {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  birth_date: string;
  age: number;
  primary_position: string | null;
  jersey_number: number | null;
  status: string;
  category: string | null;
  avg: number | null;
  byType: Record<EvalType, number | null>;
  att: number | null;
  lastEvalDays: number | null;
  goalsInProgress: number;
  color: string;
};

const STATUS_LABELS: Record<string, string> = {
  actif: "Actif",
  inactif: "Inactif",
  blesse: "Blessé",
  parti: "Parti",
};
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
const NO_CATEGORY = "Sans catégorie";

/** Minuscules, sans accents ni tirets : « Inès » et « ines » se valent. */
const norm = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-']/g, " ")
    .trim();

/** Chaque mot saisi doit correspondre au début du prénom ou du nom (dans n'importe quel ordre). */
function matches(p: PlayerRow, query: string): boolean {
  const tokens = norm(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const words = norm(`${p.first_name} ${p.last_name}`).split(/\s+/);
  return tokens.every((t) => words.some((w) => w.startsWith(t)));
}

export function PlayersBrowser({
  rows,
  colors,
  canCreate,
  initialQ,
  initialCategory,
  initialSort,
}: {
  rows: PlayerRow[];
  colors: Record<string, string>;
  canCreate: boolean;
  initialQ: string;
  initialCategory: string | null;
  initialSort: SortKey;
}) {
  const [q, setQ] = useState(initialQ);
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [sortKey, setSortKey] = useState<SortKey>(initialSort);

  const colorOf = (cat: string) => colors[cat] || "var(--brand)";

  function sync(next: {
    q?: string;
    category?: string | null;
    sort?: SortKey;
  }) {
    const nq = next.q ?? q;
    const nc = next.category === undefined ? category : next.category;
    const ns = next.sort ?? sortKey;
    const sp = new URLSearchParams();
    if (nq) sp.set("q", nq);
    if (nc) sp.set("category", nc);
    if (ns !== "nom") sp.set("sort", ns);
    const qs = sp.toString();
    window.history.replaceState(null, "", `/joueurs${qs ? `?${qs}` : ""}`);
  }

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((r) =>
      counts.set(
        r.category ?? NO_CATEGORY,
        (counts.get(r.category ?? NO_CATEGORY) ?? 0) + 1,
      ),
    );
    return Array.from(counts.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [rows]);

  const shown = useMemo(
    () =>
      rows
        .filter((r) => matches(r, q))
        .filter((r) => !category || (r.category ?? NO_CATEGORY) === category)
        .sort((a, b) => {
          if (sortKey === "moyenne") return (b.avg ?? -1) - (a.avg ?? -1);
          if (sortKey === "age") return a.birth_date < b.birth_date ? -1 : 1;
          return (
            a.last_name.localeCompare(b.last_name, "fr") ||
            a.first_name.localeCompare(b.first_name, "fr")
          );
        }),
    [rows, q, category, sortKey],
  );

  const avgs = shown.map((r) => r.avg).filter((v): v is number => v !== null);
  const atts = shown.map((r) => r.att).filter((v): v is number => v !== null);
  const stale = shown.filter(
    (r) => r.lastEvalDays === null || r.lastEvalDays > STALE_DAYS,
  ).length;
  const goalsTotal = shown.reduce((s, r) => s + r.goalsInProgress, 0);
  const kpis = [
    {
      label: "Joueurs",
      value: String(shown.length),
      hint: category ?? "Toutes catégories",
    },
    {
      label: "Moyenne globale",
      value: avgs.length
        ? (avgs.reduce((s, v) => s + v, 0) / avgs.length).toFixed(1)
        : "—",
      hint: "sur 10",
    },
    {
      label: "Présence moyenne",
      value: atts.length
        ? `${Math.round(atts.reduce((s, v) => s + v, 0) / atts.length)}%`
        : "—",
      hint: "aux entraînements",
    },
    {
      label: "À réévaluer",
      value: String(stale),
      hint: `sans évaluation depuis ${STALE_DAYS} j`,
      warn: stale > 0,
    },
    {
      label: "Objectifs en cours",
      value: String(goalsTotal),
      hint: "tous joueurs",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="kpi">
            <p
              className="kpi-value"
              style={{ color: k.warn ? "var(--amber)" : undefined }}
            >
              {k.value}
            </p>
            <p className="kpi-label">{k.label}</p>
            <p
              className="mt-0.5 text-[11px]"
              style={{ color: "var(--text-faint)" }}
            >
              {k.hint}
            </p>
          </div>
        ))}
      </div>

      <div className="card flex flex-wrap items-center gap-3">
        <input
          className="input min-w-0 flex-1"
          type="search"
          autoComplete="off"
          placeholder="Rechercher un joueur (prénom ou nom)..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            sync({ q: e.target.value });
          }}
        />
        {q && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setQ("");
              sync({ q: "" });
            }}
          >
            Effacer
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setCategory(null);
              sync({ category: null });
            }}
            className="rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{
              background: !category ? "var(--brand)" : "var(--surf-2)",
              color: !category ? "#fff" : "var(--text-dim)",
              border: "1px solid var(--border)",
            }}
          >
            Toutes ({rows.length})
          </button>
          {categories.map(([cat, count]) => {
            const c = colorOf(cat);
            const active = category === cat;
            return (
              <button
                type="button"
                key={cat}
                onClick={() => {
                  setCategory(cat);
                  sync({ category: cat });
                }}
                className="rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: active ? tint(c, 22) : "var(--surf-2)",
                  color: active ? "var(--text)" : "var(--text-dim)",
                  border: `1px solid ${active ? c : "var(--border)"}`,
                }}
              >
                <span style={{ color: c }}>●</span> {cat} ({count})
              </button>
            );
          })}
        </div>
        <div
          className="flex items-center gap-2 text-xs"
          style={{ color: "var(--text-faint)" }}
        >
          Trier par
          <div className="seg">
            {SORTS.map((s) => (
              <button
                type="button"
                key={s.key}
                onClick={() => {
                  setSortKey(s.key);
                  sync({ sort: s.key });
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${sortKey === s.key ? "active" : ""}`}
                style={
                  sortKey === s.key
                    ? { background: "var(--brand)", color: "#fff" }
                    : { color: "var(--text-faint)" }
                }
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          <p
            className="display text-xl font-bold uppercase"
            style={{ color: "var(--text-dim)" }}
          >
            Aucun joueur trouvé
          </p>
          <p className="mt-1 text-sm">
            {q || category
              ? "Essaie d'élargir la recherche ou le filtre."
              : "Ajoute ton premier joueur pour commencer le suivi."}
          </p>
          {canCreate && !q && !category && (
            <Link href="/joueurs/nouveau" className="btn-primary mt-4">
              + Nouveau joueur
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => {
            const { avg, byType, att, lastEvalDays, goalsInProgress, color } =
              p;
            const staleEval =
              lastEvalDays === null || lastEvalDays > STALE_DAYS;
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
                    style={{
                      background: tint(color, 16),
                      color,
                      boxShadow: `0 0 0 2px ${tint(color, 55)}`,
                    }}
                  >
                    {p.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.photo_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
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
                    <p
                      className="truncate text-xs"
                      style={{ color: "var(--text-faint)" }}
                    >
                      {p.jersey_number ? `#${p.jersey_number} · ` : ""}
                      {p.primary_position ?? "Poste non défini"} · {p.age} ans
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className="chip"
                        style={{
                          background: tint(color, 16),
                          color,
                          borderColor: tint(color, 45),
                        }}
                      >
                        {p.category ?? "—"}
                      </span>
                      {p.status !== "actif" && (
                        <span
                          className="chip"
                          style={{
                            color: STATUS_COLORS[p.status],
                            borderColor: tint(STATUS_COLORS[p.status], 50),
                          }}
                        >
                          {STATUS_LABELS[p.status]}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <p
                      className="display text-3xl font-bold leading-none"
                      style={{ color: scoreColor(avg) }}
                    >
                      {avg !== null ? avg.toFixed(1) : "—"}
                    </p>
                    <p
                      className="mt-1 text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: "var(--text-faint)" }}
                    >
                      Moy.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {EVAL_TYPES.map((t) => {
                    const v = byType[t];
                    return (
                      <div
                        key={t}
                        className="flex items-center gap-2"
                        title={EVAL_LABELS[t]}
                      >
                        <span
                          className="w-8 text-[10px] font-bold tracking-widest"
                          style={{ color: "var(--text-faint)" }}
                        >
                          {EVAL_SHORT[t]}
                        </span>
                        <div
                          className="h-1.5 flex-1 overflow-hidden rounded-full"
                          style={{ background: "var(--surf-2)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${v !== null ? Math.min(100, v * 10) : 0}%`,
                              background: EVAL_COLORS[t],
                            }}
                          />
                        </div>
                        <span className="w-7 text-right text-xs font-semibold tabular-nums">
                          {v !== null ? v.toFixed(1) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div
                  className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-[11px]"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text-faint)",
                  }}
                >
                  <span>
                    Présence{" "}
                    <strong
                      style={{
                        color:
                          att !== null && att < 70
                            ? "var(--amber)"
                            : "var(--text)",
                      }}
                    >
                      {att !== null ? `${att}%` : "—"}
                    </strong>
                  </span>
                  <span>
                    <strong style={{ color: "var(--text)" }}>
                      {goalsInProgress}
                    </strong>{" "}
                    objectif{goalsInProgress > 1 ? "s" : ""} en cours
                  </span>
                  <span
                    style={{ color: staleEval ? "var(--amber)" : undefined }}
                  >
                    {agoLabel(lastEvalDays)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
