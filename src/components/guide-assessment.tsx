"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveGuideAssessments } from "@/app/(app)/joueurs/[id]/actions";
import {
  SECTION_LABELS,
  STATUS_META,
  STATUS_ORDER,
  buildGrid,
  summarize,
  type AssessmentRecord,
  type AssessmentStatus,
  type GuideSection,
} from "@/lib/guide-assessment";
import type { GuideCategory } from "@/lib/technical-guide";

const tint = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;
const fmt = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

type Draft = { status: AssessmentStatus | null; comment: string };

/**
 * Grille d'évaluation d'un joueur sur les contenus du carnet technique de sa catégorie :
 * une ligne par contenu (attaque, défense), statut Acquis / En cours / À revoir, commentaire, historique.
 */
export function GuideAssessment({
  playerId,
  category,
  records,
  canEdit,
  assessorNames = {},
}: {
  playerId: string;
  category: GuideCategory | null;
  records: AssessmentRecord[];
  canEdit: boolean;
  assessorNames?: Record<string, string>;
}) {
  const rows = useMemo(() => (category ? buildGrid(category, records) : []), [category, records]);
  const summary = useMemo(() => summarize(rows), [rows]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [openHist, setOpenHist] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | AssessmentStatus | "non_evalue">("all");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!category) {
    return (
      <div className="card">
        <p className="text-sm text-faint">
          Ce joueur n&apos;a pas de catégorie, ou sa catégorie n&apos;a pas de page dans le carnet technique.{" "}
          <Link href="/carnet-technique" className="underline">Ouvrir les carnets techniques</Link>
        </p>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="card">
        <p className="text-sm text-faint">
          Le carnet technique {category.code} n&apos;a pas encore de contenus Attaque / Défense.{" "}
          <Link href={`/carnet-technique?cat=${encodeURIComponent(category.code)}`} className="underline">Compléter le carnet</Link>
        </p>
      </div>
    );
  }

  const k = (section: GuideSection, label: string) => `${section}::${label}`;
  const draftOf = (section: GuideSection, label: string): Draft => drafts[k(section, label)] ?? { status: null, comment: "" };
  const setDraft = (section: GuideSection, label: string, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [k(section, label)]: { ...draftOf(section, label), ...patch } }));
  const changed = Object.entries(drafts).filter(([, d]) => d.status !== null);

  function save() {
    setError(null);
    start(async () => {
      const items = changed.map(([key, d]) => {
        const [section, label] = key.split("::");
        return { section, label, status: d.status as string, comment: d.comment };
      });
      const r = await saveGuideAssessments(playerId, { categoryCode: category!.code, assessedAt: date, items });
      if (r.error) return setError(r.error);
      setDrafts({});
      router.refresh();
    });
  }

  const visible = rows.filter((r) => {
    if (filter === "all") return true;
    const st = r.last?.status ?? "non_evalue";
    return st === filter;
  });
  const histRow = openHist ? rows.find((r) => k(r.section, r.label) === openHist) ?? null : null;
  const histRecords = histRow
    ? records
        .filter((x) => x.section === histRow.section && x.item_label.trim().toLowerCase() === histRow.label.trim().toLowerCase())
        .sort((a, b) => (a.assessed_at < b.assessed_at ? 1 : -1))
    : [];

  return (
    <div className="space-y-4">
      {/* Synthèse */}
      <div className="card" style={{ borderTop: `3px solid ${category.color}` }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="display text-xl font-bold uppercase">
              Carnet technique <span style={{ color: category.color }}>{category.code}</span>
            </h2>
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
              {category.title}{category.subtitle ? ` · ${category.subtitle}` : ""} — {summary.total} contenu{summary.total > 1 ? "s" : ""} à maîtriser.{" "}
              <Link href={`/carnet-technique?cat=${encodeURIComponent(category.code)}`} className="underline">Voir le carnet</Link>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="display text-3xl font-bold leading-none" style={{ color: STATUS_META.acquis.color }}>{summary.pct !== null ? `${summary.pct}%` : "—"}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>acquis</p>
            </div>
          </div>
        </div>
        <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full" style={{ background: "var(--surf-2)" }} aria-hidden>
          {STATUS_ORDER.map((st) => (
            <div key={st} style={{ width: `${(summary[st] / Math.max(1, summary.total)) * 100}%`, background: STATUS_META[st].color }} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="chip" style={filter === "all" ? { borderColor: "var(--brand)", color: "var(--text)" } : undefined} onClick={() => setFilter("all")}>
            Tous ({summary.total})
          </button>
          {STATUS_ORDER.map((st) => (
            <button key={st} type="button" className="chip" style={filter === st ? { borderColor: STATUS_META[st].color, color: "var(--text)" } : undefined} onClick={() => setFilter(st)}>
              <span style={{ color: STATUS_META[st].color }}>{STATUS_META[st].icon}</span> {STATUS_META[st].short} ({summary[st]})
            </button>
          ))}
          <button type="button" className="chip" style={filter === "non_evalue" ? { borderColor: "var(--brand)", color: "var(--text)" } : undefined} onClick={() => setFilter("non_evalue")}>
            Non évalué ({summary.non_evalue})
          </button>
        </div>
      </div>

      {/* Grille */}
      {(["attack", "defense"] as const).map((section) => {
        const list = visible.filter((r) => r.section === section);
        if (list.length === 0) return null;
        return (
          <div key={section} className="card overflow-hidden p-0">
            <div className="flex items-center justify-between px-4 py-3" style={{ background: tint(category.color, 10), borderBottom: "1px solid var(--border)" }}>
              <h3 className="display text-lg font-bold uppercase" style={{ color: category.color }}>{SECTION_LABELS[section]}</h3>
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>{list.length} contenu{list.length > 1 ? "s" : ""}</span>
            </div>
            <ul>
              {list.map((r) => {
                const d = draftOf(r.section, r.label);
                const current = d.status ?? ((r.last?.status as AssessmentStatus | undefined) ?? null);
                const meta = current ? STATUS_META[current] : null;
                return (
                  <li
                    key={r.label}
                    className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]"
                    style={{ borderTop: "1px solid var(--border)", background: d.status ? tint("#f59e0b", 6) : undefined }}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {meta && <span className="mr-1.5" style={{ color: meta.color }}>{meta.icon}</span>}
                        {r.label}
                      </p>
                      {r.text && <p className="mt-0.5 text-xs" style={{ color: "var(--text-dim)" }}>{r.text}</p>}
                      <p className="mt-1 text-[11px]" style={{ color: "var(--text-faint)" }}>
                        {r.last ? (
                          <>
                            Dernière évaluation : {fmt(r.last.assessed_at)}
                            {r.last.assessor_id && assessorNames[r.last.assessor_id] ? ` · ${assessorNames[r.last.assessor_id]}` : ""}
                            {r.last.comment ? ` — « ${r.last.comment} »` : ""}
                            {r.count > 1 && (
                              <> · <button type="button" className="underline" onClick={() => setOpenHist(k(r.section, r.label))}>historique ({r.count})</button></>
                            )}
                          </>
                        ) : (
                          "Pas encore évalué"
                        )}
                      </p>
                      {canEdit && d.status && (
                        <input
                          className="input mt-2 w-full"
                          placeholder="Commentaire (facultatif)"
                          value={d.comment}
                          onChange={(e) => setDraft(r.section, r.label, { comment: e.target.value })}
                        />
                      )}
                    </div>
                    {canEdit && (
                      <div className="seg self-start" role="group" aria-label={`Statut — ${r.label}`}>
                        {STATUS_ORDER.map((st) => {
                          const on = current === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              className={on ? "active" : ""}
                              style={on ? { background: STATUS_META[st].color, color: "#111" } : undefined}
                              onClick={() => setDraft(r.section, r.label, { status: st })}
                              title={STATUS_META[st].label}
                            >
                              {STATUS_META[st].icon} {STATUS_META[st].short}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {/* Barre d'enregistrement */}
      {canEdit && (
        <div
          className="sticky bottom-3 z-20 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 shadow-xl"
          style={{ background: "var(--surf)", border: "1px solid var(--border)" }}
        >
          <label className="text-xs" style={{ color: "var(--text-faint)" }}>
            Date d&apos;évaluation{" "}
            <input className="input ml-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "auto" }} />
          </label>
          <span className="text-sm">{changed.length} contenu{changed.length > 1 ? "s" : ""} modifié{changed.length > 1 ? "s" : ""}</span>
          <button type="button" className="btn-primary" disabled={pending || changed.length === 0} onClick={save}>
            {pending ? "Enregistrement…" : "Enregistrer l'évaluation"}
          </button>
          {changed.length > 0 && !pending && (
            <button type="button" className="btn-secondary" onClick={() => setDrafts({})}>Annuler</button>
          )}
          {error && <span className="text-xs" style={{ color: "#f87171" }}>{error}</span>}
        </div>
      )}

      {/* Historique d'un contenu */}
      {histRow && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6" style={{ background: "rgba(0,0,0,.7)" }} onClick={() => setOpenHist(null)} role="dialog" aria-modal="true" aria-label={`Historique — ${histRow.label}`}>
          <div className="card w-full max-w-lg space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold">{histRow.label} — historique</h2>
              <button type="button" className="text-xs" onClick={() => setOpenHist(null)}>Fermer ✕</button>
            </div>
            <ul className="space-y-2 text-sm">
              {histRecords.map((h) => {
                const m = STATUS_META[h.status as AssessmentStatus];
                return (
                  <li key={h.id} className="rounded-lg px-3 py-2" style={{ background: "var(--surf-2)" }}>
                    <span className="font-semibold" style={{ color: m?.color }}>{m?.icon} {m?.label ?? h.status}</span>
                    <span className="text-xs" style={{ color: "var(--text-faint)" }}> · {fmt(h.assessed_at)}{h.assessor_id && assessorNames[h.assessor_id] ? ` · ${assessorNames[h.assessor_id]}` : ""}</span>
                    {h.comment && <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>{h.comment}</p>}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
