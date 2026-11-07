"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { BLOCK_LABEL, blockColor, clockAt } from "@/lib/sessions";
import {
  FOCUSES,
  focusColor,
  focusLabel,
  formatRange,
  type SeasonBlock,
} from "@/lib/blocks";
import { deleteBlock, saveBlock } from "@/app/(app)/seances/blocks-actions";

export type SessionCard = {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  duration: number | null;
  teamName: string | null;
  category: string | null;
  color: string;
  gym: string | null;
  intensity: string | null;
  blocks: { type: string; minutes: number | null; name: string }[];
  focus: string | null;
  coachName: string | null;
};

type When = "upcoming" | "past" | "all";
const INTENSITY: Record<string, string> = {
  faible: "Intensité faible",
  moyenne: "Intensité moyenne",
  elevee: "Intensité élevée",
};
const norm = (v: string) =>
  v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tint = (c: string, pct: number) =>
  `color-mix(in srgb, ${c} ${pct}%, transparent)`;

/* ------------------------------------------------------------------ */

function SessionTile({
  s,
  todayKey,
  number,
}: {
  s: SessionCard;
  todayKey: string;
  number: number | null;
}) {
  const d = new Date(`${s.date}T00:00:00`);
  const total =
    s.blocks.reduce((sum, b) => sum + (b.minutes ?? 0), 0) || s.duration || 0;
  const end = s.start_time ? clockAt(s.start_time.slice(0, 5), total) : null;
  const isPast = s.date < todayKey;
  return (
    <Link
      href={`/seances/${s.id}`}
      className="card flex min-w-0 flex-col gap-3 transition-transform hover:-translate-y-0.5"
      style={{ borderTop: `3px solid ${s.color}`, opacity: isPast ? 0.85 : 1 }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex w-14 shrink-0 flex-col items-center rounded-xl py-1.5"
          style={{ background: tint(s.color, 16), color: s.color }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}
          </span>
          <span className="display text-2xl font-bold leading-none">{d.getDate()}</span>
          <span className="text-[10px] font-bold uppercase">
            {d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold" title={s.title}>
            {number ? `${number}. ` : ""}
            {s.title}
          </p>
          <p className="truncate text-xs" style={{ color: "var(--text-faint)" }}>
            {s.start_time
              ? `${s.start_time.slice(0, 5)}${end ? ` → ${end}` : ""}`
              : "Heure non définie"}
            {total ? ` · ${total} min` : ""}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {s.focus && (
              <span
                className="chip"
                style={{
                  background: tint(focusColor(s.focus), 16),
                  color: focusColor(s.focus),
                  borderColor: tint(focusColor(s.focus), 45),
                }}
              >
                {focusLabel(s.focus)}
              </span>
            )}
            {s.coachName && <span className="chip">👤 {s.coachName}</span>}
            {s.teamName && (
              <span
                className="chip"
                style={{
                  background: tint(s.color, 16),
                  color: s.color,
                  borderColor: tint(s.color, 45),
                }}
              >
                {s.teamName}
              </span>
            )}
            {s.gym && <span className="chip">{s.gym}</span>}
            {s.intensity && (
              <span className="chip">{INTENSITY[s.intensity] ?? s.intensity}</span>
            )}
          </div>
        </div>
      </div>

      {s.blocks.length > 0 ? (
        <>
          <div className="flex h-2 gap-1 overflow-hidden rounded-full">
            {s.blocks.map((b, i) => (
              <div
                key={i}
                style={{ flex: b.minutes || 1, background: blockColor(b.type) }}
                title={`${b.name} · ${b.minutes ?? "?"} min`}
              />
            ))}
          </div>
          <p className="line-clamp-2 text-xs" style={{ color: "var(--text-dim)" }}>
            {s.blocks
              .map((b) => `${b.name}${b.minutes ? ` (${b.minutes}')` : ""}`)
              .join(" · ")}
          </p>
        </>
      ) : (
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          Déroulé à compléter.
        </p>
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ */

function BlockModal({
  block,
  onClose,
}: {
  block: SeasonBlock | null;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
      onClick={onClose}
    >
      <form
        className="card w-full max-w-md space-y-3"
        onClick={(e) => e.stopPropagation()}
        action={(fd) => {
          setError(null);
          startTransition(async () => {
            const res = await saveBlock(block?.id ?? null, {
              name: String(fd.get("name") ?? ""),
              start_date: String(fd.get("start_date") ?? ""),
              end_date: String(fd.get("end_date") ?? ""),
              planned_sessions: Number(fd.get("planned_sessions") ?? 0),
              major_axis: String(fd.get("major_axis") ?? ""),
            });
            if (res.error) setError(res.error);
            else onClose();
          });
        }}
      >
        <h2 className="font-semibold">{block ? `Modifier ${block.name}` : "Nouveau block"}</h2>
        <label className="label">
          Nom
          <input className="input mt-1 w-full" name="name" defaultValue={block?.name ?? ""} placeholder="Block 6" required maxLength={80} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="label">
            Début
            <input className="input mt-1 w-full" type="date" name="start_date" defaultValue={block?.start_date ?? ""} required />
          </label>
          <label className="label">
            Fin
            <input className="input mt-1 w-full" type="date" name="end_date" defaultValue={block?.end_date ?? ""} required />
          </label>
        </div>
        <label className="label">
          Nombre de séances prévues
          <input className="input mt-1 w-full" type="number" min={0} max={200} name="planned_sessions" defaultValue={block?.planned_sessions ?? 10} required />
        </label>
        <label className="label">
          Axe majeur de travail
          <input className="input mt-1 w-full" name="major_axis" defaultValue={block?.major_axis ?? ""} placeholder="1c1 avec gestion d'avantage" maxLength={200} />
        </label>
        {error && (
          <p className="text-sm" style={{ color: "#ff6b6b" }}>
            {error}
          </p>
        )}
        <div className="flex items-center gap-2">
          {block && (
            <button
              type="button"
              className="text-xs"
              style={{ color: "#ff6b6b" }}
              onClick={() => {
                if (!confirm(`Supprimer ${block.name} ? Les séances ne sont pas supprimées.`)) return;
                startTransition(async () => {
                  const res = await deleteBlock(block.id);
                  if (res.error) setError(res.error);
                  else onClose();
                });
              }}
            >
              Supprimer
            </button>
          )}
          <span className="flex-1" />
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="btn-primary" disabled={pending}>
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function SessionsBrowser({
  sessions,
  todayKey,
  seasonBlocks,
  canManageBlocks,
  canCreate,
}: {
  sessions: SessionCard[];
  todayKey: string;
  seasonBlocks: SeasonBlock[];
  canManageBlocks: boolean;
  canCreate: boolean;
}) {
  const [when, setWhen] = useState<When>("all");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<SeasonBlock | "new" | null>(null);

  const upcomingCount = sessions.filter((s) => s.date >= todayKey).length;
  const filtering = when !== "all" || !!q.trim() || !!cat || !!focus;

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    sessions.forEach((s) => s.category && m.set(s.category, (m.get(s.category) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [sessions]);

  const shown = useMemo(() => {
    const tokens = norm(q).split(/\s+/).filter(Boolean);
    return sessions.filter((s) => {
      if (when === "upcoming" && s.date < todayKey) return false;
      if (when === "past" && s.date >= todayKey) return false;
      if (cat && s.category !== cat) return false;
      if (focus && s.focus !== focus) return false;
      if (tokens.length === 0) return true;
      const hay = norm(
        [
          s.title,
          s.teamName ?? "",
          s.gym ?? "",
          s.coachName ?? "",
          focusLabel(s.focus) ?? "",
          s.blocks.map((b) => `${b.name} ${BLOCK_LABEL[b.type] ?? ""}`).join(" "),
        ].join(" "),
      );
      return tokens.every((t) => hay.includes(t));
    });
  }, [sessions, when, q, cat, focus, todayKey]);

  /** Séances rangées par block (par date), numérotées dans leur block. */
  const groups = useMemo(() => {
    const byDate = (a: SessionCard, b: SessionCard) =>
      `${a.date} ${a.start_time ?? ""}`.localeCompare(`${b.date} ${b.start_time ?? ""}`);
    const out = seasonBlocks.map((block) => {
      const all = sessions
        .filter((s) => s.date >= block.start_date && s.date <= block.end_date)
        .sort(byDate);
      const order = new Map(all.map((s, i) => [s.id, i + 1]));
      return {
        block,
        created: all.length,
        order,
        list: shown.filter((s) => order.has(s.id)).sort(byDate),
      };
    });
    const inBlock = new Set(out.flatMap((g) => Array.from(g.order.keys())));
    const loose = shown.filter((s) => !inBlock.has(s.id)).sort(byDate);
    return { out, loose };
  }, [seasonBlocks, sessions, shown]);

  const counts = {
    upcoming: upcomingCount,
    past: sessions.length - upcomingCount,
    all: sessions.length,
  };
  const nothing =
    shown.length === 0 && (filtering || seasonBlocks.length === 0);

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center gap-3">
        <input
          className="input min-w-0 flex-1"
          type="search"
          autoComplete="off"
          placeholder="Rechercher une séance, un coach, un travail, un gymnase…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="seg">
          {(
            [
              ["all", "Toutes"],
              ["upcoming", "À venir"],
              ["past", "Passées"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setWhen(k)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${when === k ? "active" : ""}`}
              style={
                when === k
                  ? { background: "var(--brand)", color: "#fff" }
                  : { color: "var(--text-faint)" }
              }
            >
              {label} ({counts[k]})
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFocus(null)}
          className="chip"
          style={!focus ? { background: "var(--brand)", color: "#fff", borderColor: "var(--brand)" } : undefined}
        >
          Tous les travaux
        </button>
        {FOCUSES.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFocus(focus === f.value ? null : f.value)}
            className="chip"
            style={
              focus === f.value
                ? { background: tint(f.color, 22), borderColor: f.color, color: "var(--text)" }
                : undefined
            }
          >
            <span style={{ color: f.color }}>●</span> {f.label}
          </button>
        ))}
        {canManageBlocks && (
          <button type="button" className="chip ml-auto" onClick={() => setEditingBlock("new")}>
            ＋ Nouveau block
          </button>
        )}
      </div>

      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCat(null)}
            className="rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{
              background: !cat ? "var(--brand)" : "var(--surf-2)",
              color: !cat ? "#fff" : "var(--text-dim)",
              border: "1px solid var(--border)",
            }}
          >
            Toutes catégories
          </button>
          {categories.map(([c, n]) => {
            const color = sessions.find((s) => s.category === c)?.color ?? "var(--brand)";
            const on = cat === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCat(on ? null : c)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: on ? tint(color, 22) : "var(--surf-2)",
                  color: on ? "var(--text)" : "var(--text-dim)",
                  border: `1px solid ${on ? color : "var(--border)"}`,
                }}
              >
                <span style={{ color }}>●</span> {c} ({n})
              </button>
            );
          })}
        </div>
      )}

      {nothing && (
        <div className="empty">
          <p className="display text-xl font-bold uppercase" style={{ color: "var(--text-dim)" }}>
            {sessions.length === 0 ? "Aucune séance" : "Aucun résultat"}
          </p>
          <p className="mt-1 text-sm">
            {sessions.length === 0
              ? "Crée ta première séance avec le bouton « Nouvelle séance »."
              : "Essaie d'autres mots ou un autre filtre."}
          </p>
        </div>
      )}

      {groups.out.map((g) => {
        const { block } = g;
        if (filtering && g.list.length === 0) return null;
        const planned = block.planned_sessions;
        const pct = planned ? Math.min(100, Math.round((g.created / planned) * 100)) : 0;
        const free = Math.max(0, planned - g.created);
        const lastDate = g.list.length ? g.list[g.list.length - 1].date : block.start_date;
        return (
          <section key={block.id} className="space-y-3">
            <div className="card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="display text-2xl font-bold uppercase">{block.name}</h2>
                  <p className="text-sm" style={{ color: "var(--text-faint)" }}>
                    {formatRange(block.start_date, block.end_date)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="display text-2xl font-bold leading-none">
                      {g.created}
                      <span style={{ color: "var(--text-faint)" }}> / {planned}</span>
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                      séances créées
                    </p>
                  </div>
                  {canManageBlocks && (
                    <button type="button" className="chip" onClick={() => setEditingBlock(block)}>
                      Modifier
                    </button>
                  )}
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--surf-2)" }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--brand)" }} />
              </div>
              {block.major_axis && (
                <p className="text-sm">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--brand)" }}>
                    Axe majeur
                  </span>{" "}
                  {block.major_axis}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {g.list.map((s) => (
                <SessionTile key={s.id} s={s} todayKey={todayKey} number={g.order.get(s.id) ?? null} />
              ))}
            </div>
            {!filtering && canCreate && free > 0 && (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: Math.min(free, 24) }, (_, i) => (
                  <Link
                    key={`slot-${i}`}
                    href={`/seances/nouvelle?date=${lastDate}`}
                    className="flex min-h-[48px] items-center justify-center rounded-lg border border-dashed px-3 py-2 text-center text-xs"
                    style={{ borderColor: "var(--border)", color: "var(--text-faint)" }}
                  >
                    ＋ Séance {g.created + i + 1} · à planifier
                  </Link>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {groups.loose.length > 0 && (
        <section className="space-y-3">
          {seasonBlocks.length > 0 && (
            <h2 className="display text-xl font-bold uppercase" style={{ color: "var(--text-dim)" }}>
              Hors block
            </h2>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groups.loose.map((s) => (
              <SessionTile key={s.id} s={s} todayKey={todayKey} number={null} />
            ))}
          </div>
        </section>
      )}

      {editingBlock && (
        <BlockModal
          key={editingBlock === "new" ? "new" : editingBlock.id}
          block={editingBlock === "new" ? null : editingBlock}
          onClose={() => setEditingBlock(null)}
        />
      )}
    </div>
  );
}
