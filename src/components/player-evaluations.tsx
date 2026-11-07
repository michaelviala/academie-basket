"use client";

import { useState, useTransition } from "react";
import {
  deleteEvaluation,
  updateEvaluation,
} from "@/app/(app)/joueurs/[id]/actions";
import { CompetencyHistogram } from "@/components/competency-histogram";
import { EVAL_COLORS } from "@/lib/player-stats";
import { PlayerEvaluationChart } from "@/components/player-evaluation-chart";

const EVAL_TYPE_LABELS: Record<string, string> = {
  technique: "Technique",
  tactique: "Tactique",
  physique: "Physique",
  mental: "Mental",
};

const EVAL_TYPES = ["technique", "tactique", "physique", "mental"] as const;
type EvalType = (typeof EVAL_TYPES)[number];

type Evaluation = {
  id: string;
  evaluation_type: string;
  score: number;
  comment: string | null;
  evaluated_at: string;
  skills: { name: string; category?: string } | null;
  evaluator_id?: string | null;
  video_url?: string | null;
};

const CAT_LABELS: Record<string, string> = {
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
const catLabel = (c: string | undefined | null) => (c ? (CAT_LABELS[c] ?? c.charAt(0).toUpperCase() + c.slice(1)) : "Autre");

const fmtDate = (d: string) =>
  new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
const scoreCol = (v: number) =>
  v >= 7 ? "var(--green)" : v >= 5 ? "var(--amber)" : "var(--red)";

export function PlayerEvaluations({
  playerId,
  evaluatorNames = {},
  canEdit = false,
  initialType = "technique",
  evaluations,
  attendanceRate,
  attendancePresent,
  attendanceTotal,
}: {
  playerId: string;
  evaluatorNames?: Record<string, string>;
  canEdit?: boolean;
  initialType?: EvalType;
  evaluations: Evaluation[];
  attendanceRate: number | null;
  attendancePresent: number;
  attendanceTotal: number;
}) {
  const [active, setActive] = useState<EvalType>(initialType);

  const byType = (type: EvalType) =>
    evaluations.filter((e) => e.evaluation_type === type);

  const avgByType = (type: EvalType) => {
    const rows = byType(type);
    if (rows.length === 0) return null;
    return (
      rows.reduce((s, r) => s + Number(r.score), 0) / rows.length
    ).toFixed(1);
  };

  const [cat, setCat] = useState<string>("");
  const typeRows = byType(active);
  const activeRows = cat ? typeRows.filter((e) => (e.skills?.category ?? "") === cat) : typeRows;

  // Types de compétence (tir, dribble, passe…) présents dans la rubrique active
  const groups = (() => {
    const map = new Map<string, Evaluation[]>();
    for (const e of activeRows) {
      const k = e.skills?.category ?? "";
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return [...map.entries()].sort((a, b) => catLabel(a[0]).localeCompare(catLabel(b[0])));
  })();
  const catCounts = (() => {
    const map = new Map<string, number>();
    for (const e of typeRows) map.set(e.skills?.category ?? "", (map.get(e.skills?.category ?? "") ?? 0) + 1);
    return [...map.entries()].sort((a, b) => catLabel(a[0]).localeCompare(catLabel(b[0])));
  })();
  const histoLabel = (e: Evaluation) => {
    const name = e.skills?.name ?? EVAL_TYPE_LABELS[active];
    // sans filtre, on préfixe par le type de compétence (ex. « Sous pression » existe en Tir, Dribble, Passe)
    return !cat && catCounts.length > 1 && e.skills?.category ? `${catLabel(e.skills.category)} · ${name}` : name;
  };
  const avgOf = (rows: Evaluation[]) => (rows.reduce((s, r) => s + Number(r.score), 0) / rows.length).toFixed(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const opened = openId
    ? (evaluations.find((e) => e.id === openId) ?? null)
    : null;

  // note précédente sur la même compétence (ou, à défaut, la même rubrique)
  const previousOf = (e: Evaluation) => {
    const older = evaluations
      .filter(
        (o) =>
          o.id !== e.id &&
          o.evaluation_type === e.evaluation_type &&
          o.evaluated_at <= e.evaluated_at &&
          o.evaluated_at !== e.evaluated_at,
      )
      .filter((o) => (e.skills ? o.skills?.name === e.skills.name : true))
      .sort((a, b) => (a.evaluated_at < b.evaluated_at ? 1 : -1));
    return older[0] ?? null;
  };

  function close() {
    setOpenId(null);
    setEditing(false);
    setError(null);
  }

  function save(fd: FormData) {
    if (!opened) return;
    setError(null);
    startTransition(async () => {
      const r = await updateEvaluation(playerId, opened.id, fd);
      if (r?.error) setError(r.error);
      else close();
    });
  }

  function remove() {
    if (
      !opened ||
      !window.confirm("Supprimer définitivement cette évaluation ?")
    )
      return;
    setError(null);
    startTransition(async () => {
      const r = await deleteEvaluation(playerId, opened.id);
      if (r?.error) setError(r.error);
      else close();
    });
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {EVAL_TYPES.map((t) => {
          const isActive = t === active;
          const rows = byType(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => { setActive(t); setCat(""); }}
              className="rounded-xl px-4 py-4 text-center transition-colors"
              style={{
                background: "var(--surf)",
                border: isActive
                  ? "2px solid var(--brand)"
                  : "1px solid var(--border)",
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--text-dim)" }}
              >
                {EVAL_TYPE_LABELS[t]}
              </p>
              <p className="display mt-1 text-3xl font-bold">
                {avgByType(t) ?? "—"}
              </p>
              <p
                className="mt-0.5 text-xs"
                style={{ color: "var(--text-faint)" }}
              >
                {rows.length} évaluation{rows.length > 1 ? "s" : ""}
              </p>
            </button>
          );
        })}

        <div
          className="flex items-center gap-3 rounded-xl px-4 py-4"
          style={{
            background: "var(--surf)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="relative h-12 w-12 flex-shrink-0">
            <svg width="48" height="48" viewBox="0 0 48 48">
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="var(--surf-2)"
                strokeWidth="5"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="var(--green)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={125.6}
                strokeDashoffset={
                  attendanceRate !== null
                    ? 125.6 * (1 - attendanceRate / 100)
                    : 125.6
                }
                transform="rotate(-90 24 24)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
              {attendanceRate !== null ? `${attendanceRate}%` : "—"}
            </div>
          </div>
          <div>
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--text-dim)" }}
            >
              Présence
            </p>
            <p
              className="mt-0.5 text-xs"
              style={{ color: "var(--text-faint)" }}
            >
              {attendancePresent} / {attendanceTotal} entraînements
            </p>
          </div>
        </div>
      </div>
      <p className="mb-4 mt-2 text-xs" style={{ color: "var(--text-faint)" }}>
        Cliquer sur un indice affiche le détail de ses évaluations ci-dessous.
      </p>

      <div className="card mb-4">
        <h2 className="mb-3 font-semibold">Progression</h2>
        <PlayerEvaluationChart evaluations={evaluations} />
      </div>

      <div className="card mb-4">
        <h2 className="mb-3 font-semibold">
          Compétences — {EVAL_TYPE_LABELS[active]}
          {cat ? ` · ${catLabel(cat)}` : ""}
        </h2>
        <CompetencyHistogram
          color={EVAL_COLORS[active]}
          evals={activeRows.map((e) => ({
            skill: histoLabel(e),
            score: Number(e.score),
            date: e.evaluated_at,
          }))}
        />
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">
            Historique — {EVAL_TYPE_LABELS[active]}
          </h2>
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
            Moyenne : {avgByType(active) ?? "—"} / 10 sur {activeRows.length}{" "}
            évaluation{activeRows.length > 1 ? "s" : ""}
          </span>
        </div>
        {catCounts.length > 1 && (
          <div className="mb-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setCat("")} className="chip" style={!cat ? { borderColor: "var(--brand)", color: "var(--text)" } : undefined}>
              Tous ({typeRows.length})
            </button>
            {catCounts.map(([k, n]) => (
              <button key={k || "autre"} type="button" onClick={() => setCat(k)} className="chip" style={cat === k ? { borderColor: "var(--brand)", color: "var(--text)" } : undefined}>
                {catLabel(k)} ({n})
              </button>
            ))}
          </div>
        )}
        <div className="max-h-[32rem] space-y-4 overflow-y-auto">
          {groups.map(([k, rows]) => (
            <div key={k || "autre"} className="space-y-2">
              <div className="flex items-baseline justify-between border-b pb-1" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
                  {EVAL_TYPE_LABELS[active]} · {catLabel(k)}
                </p>
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                  Moyenne {avgOf(rows)} / 10 · {rows.length} évaluation{rows.length > 1 ? "s" : ""}
                </span>
              </div>
              {rows.map((e) => (
              <button
                type="button"
                key={e.id}
                onClick={() => setOpenId(e.id)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:brightness-125"
                style={{ background: "var(--surf-2)" }}
                title="Ouvrir l'évaluation"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {e.skills?.name ?? EVAL_TYPE_LABELS[active]}
                  </p>
                  <p
                    className="truncate text-xs"
                    style={{ color: "var(--text-faint)" }}
                  >
                    {e.evaluated_at}
                    {e.comment ? ` · ${e.comment}` : ""}
                  </p>
                </div>
                <span className="flex items-center gap-2">
                  <span
                    className="badge"
                    style={{
                      background: "rgba(255,106,31,0.14)",
                      color: "var(--text)",
                      borderColor: "transparent",
                    }}
                  >
                    {e.score}
                  </span>
                  <span style={{ color: "var(--text-faint)" }}>›</span>
                </span>
              </button>
              ))}
            </div>
          ))}
          {activeRows.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-faint)" }}>
              Aucune évaluation {EVAL_TYPE_LABELS[active].toLowerCase()}{" "}
              enregistrée.
            </p>
          )}
        </div>
      </div>

      {opened && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.65)" }}
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="card max-h-[90vh] w-full max-w-md overflow-y-auto"
            style={{ borderTop: `3px solid ${scoreCol(Number(opened.score))}` }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-dim)" }}
                >
                  Évaluation{" "}
                  {EVAL_TYPE_LABELS[opened.evaluation_type] ??
                    opened.evaluation_type}
                </p>
                <h3 className="display text-2xl font-bold uppercase leading-tight">
                  {opened.skills?.name ??
                    EVAL_TYPE_LABELS[opened.evaluation_type]}
                </h3>
              </div>
              <button
                type="button"
                onClick={close}
                className="text-xl leading-none"
                style={{ color: "var(--text-faint)" }}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            {!editing ? (
              <>
                <div className="mt-4 flex items-end gap-3">
                  <p
                    className="display text-5xl font-bold leading-none"
                    style={{ color: scoreCol(Number(opened.score)) }}
                  >
                    {opened.score}
                    <span
                      className="ml-1 text-base font-medium"
                      style={{ color: "var(--text-faint)" }}
                    >
                      /10
                    </span>
                  </p>
                  {(() => {
                    const prev = previousOf(opened);
                    if (!prev)
                      return (
                        <span
                          className="pb-1 text-xs"
                          style={{ color: "var(--text-faint)" }}
                        >
                          Première évaluation
                        </span>
                      );
                    const d = Number(opened.score) - Number(prev.score);
                    return (
                      <span
                        className="pb-1 text-xs font-semibold"
                        style={{
                          color:
                            d > 0
                              ? "var(--green)"
                              : d < 0
                                ? "var(--red)"
                                : "var(--text-faint)",
                        }}
                      >
                        {d > 0 ? "▲ +" : d < 0 ? "▼ " : "= "}
                        {d.toFixed(1)} vs {prev.score} le {prev.evaluated_at}
                      </span>
                    );
                  })()}
                </div>
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full"
                  style={{ background: "var(--surf-2)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Number(opened.score) * 10}%`,
                      background: scoreCol(Number(opened.score)),
                    }}
                  />
                </div>

                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt style={{ color: "var(--text-faint)" }}>Date</dt>
                    <dd className="text-right capitalize">
                      {fmtDate(opened.evaluated_at)}
                    </dd>
                  </div>
                  {opened.skills?.category && (
                    <div className="flex justify-between gap-3">
                      <dt style={{ color: "var(--text-faint)" }}>Catégorie</dt>
                      <dd className="capitalize">{opened.skills.category}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <dt style={{ color: "var(--text-faint)" }}>Évaluateur</dt>
                    <dd>
                      {(opened.evaluator_id &&
                        evaluatorNames[opened.evaluator_id]) ||
                        "—"}
                    </dd>
                  </div>
                </dl>

                <div
                  className="mt-4 rounded-lg p-3 text-sm"
                  style={{ background: "var(--surf-2)" }}
                >
                  <p
                    className="mb-1 text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--text-faint)" }}
                  >
                    Commentaire
                  </p>
                  <p className="whitespace-pre-wrap">
                    {opened.comment || "Aucun commentaire."}
                  </p>
                </div>

                {opened.video_url && (
                  <a
                    href={opened.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary mt-3 inline-flex"
                  >
                    ▶ Voir la vidéo
                  </a>
                )}

                {error && (
                  <p className="mt-3 text-xs" style={{ color: "#f87171" }}>
                    {error}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => setEditing(true)}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ color: "#f87171" }}
                        onClick={remove}
                        disabled={pending}
                      >
                        {pending ? "…" : "Supprimer"}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={close}
                  >
                    Fermer
                  </button>
                </div>
              </>
            ) : (
              <form action={save} className="mt-4 grid grid-cols-2 gap-3">
                <label
                  className="text-xs"
                  style={{ color: "var(--text-faint)" }}
                >
                  Note (1 à 10)
                  <input
                    className="input mt-1"
                    type="number"
                    name="score"
                    min={1}
                    max={10}
                    step={0.5}
                    defaultValue={opened.score}
                    required
                  />
                </label>
                <label
                  className="text-xs"
                  style={{ color: "var(--text-faint)" }}
                >
                  Date
                  <input
                    className="input mt-1"
                    type="date"
                    name="evaluated_at"
                    defaultValue={opened.evaluated_at.slice(0, 10)}
                    required
                  />
                </label>
                <label
                  className="col-span-2 text-xs"
                  style={{ color: "var(--text-faint)" }}
                >
                  Commentaire
                  <textarea
                    className="input mt-1"
                    name="comment"
                    rows={4}
                    defaultValue={opened.comment ?? ""}
                  />
                </label>
                {error && (
                  <p
                    className="col-span-2 text-xs"
                    style={{ color: "#f87171" }}
                  >
                    {error}
                  </p>
                )}
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={pending}
                >
                  {pending ? "Enregistrement…" : "Enregistrer"}
                </button>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                  }}
                >
                  Annuler
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
