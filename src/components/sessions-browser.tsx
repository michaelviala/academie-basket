"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BLOCK_LABEL, blockColor, clockAt } from "@/lib/sessions";

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

export function SessionsBrowser({
  sessions,
  todayKey,
}: {
  sessions: SessionCard[];
  todayKey: string;
}) {
  const upcomingCount = sessions.filter((s) => s.date >= todayKey).length;
  const [when, setWhen] = useState<When>(
    upcomingCount > 0 ? "upcoming" : "all",
  );
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    sessions.forEach(
      (s) => s.category && m.set(s.category, (m.get(s.category) ?? 0) + 1),
    );
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [sessions]);

  const shown = useMemo(() => {
    const tokens = norm(q).split(/\s+/).filter(Boolean);
    const list = sessions.filter((s) => {
      if (when === "upcoming" && s.date < todayKey) return false;
      if (when === "past" && s.date >= todayKey) return false;
      if (cat && s.category !== cat) return false;
      if (tokens.length === 0) return true;
      const hay = norm(
        [
          s.title,
          s.teamName ?? "",
          s.gym ?? "",
          s.blocks
            .map((b) => `${b.name} ${BLOCK_LABEL[b.type] ?? ""}`)
            .join(" "),
        ].join(" "),
      );
      return tokens.every((t) => hay.includes(t));
    });
    return list.sort((a, b) => {
      const k = `${a.date} ${a.start_time ?? ""}`.localeCompare(
        `${b.date} ${b.start_time ?? ""}`,
      );
      return when === "upcoming" ? k : -k;
    });
  }, [sessions, when, q, cat, todayKey]);

  const counts = {
    upcoming: upcomingCount,
    past: sessions.length - upcomingCount,
    all: sessions.length,
  };

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center gap-3">
        <input
          className="input min-w-0 flex-1"
          type="search"
          autoComplete="off"
          placeholder="Rechercher une séance, un bloc, un gymnase…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="seg">
          {(
            [
              ["upcoming", "À venir"],
              ["past", "Passées"],
              ["all", "Toutes"],
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
            const color =
              sessions.find((s) => s.category === c)?.color ?? "var(--brand)";
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

      {shown.length === 0 ? (
        <div className="empty">
          <p
            className="display text-xl font-bold uppercase"
            style={{ color: "var(--text-dim)" }}
          >
            {sessions.length === 0 ? "Aucune séance" : "Aucun résultat"}
          </p>
          <p className="mt-1 text-sm">
            {sessions.length === 0
              ? "Crée ta première séance avec le bouton « Nouvelle séance »."
              : "Essaie d'autres mots ou un autre filtre."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((s) => {
            const d = new Date(`${s.date}T00:00:00`);
            const total =
              s.blocks.reduce((sum, b) => sum + (b.minutes ?? 0), 0) ||
              s.duration ||
              0;
            const end = s.start_time
              ? clockAt(s.start_time.slice(0, 5), total)
              : null;
            const isPast = s.date < todayKey;
            return (
              <Link
                key={s.id}
                href={`/seances/${s.id}`}
                className="card flex min-w-0 flex-col gap-3 transition-transform hover:-translate-y-0.5"
                style={{
                  borderTop: `3px solid ${s.color}`,
                  opacity: isPast ? 0.85 : 1,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex w-14 shrink-0 flex-col items-center rounded-xl py-1.5"
                    style={{ background: tint(s.color, 16), color: s.color }}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {d
                        .toLocaleDateString("fr-FR", { weekday: "short" })
                        .replace(".", "")}
                    </span>
                    <span className="display text-2xl font-bold leading-none">
                      {d.getDate()}
                    </span>
                    <span className="text-[10px] font-bold uppercase">
                      {d
                        .toLocaleDateString("fr-FR", { month: "short" })
                        .replace(".", "")}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold" title={s.title}>
                      {s.title}
                    </p>
                    <p
                      className="truncate text-xs"
                      style={{ color: "var(--text-faint)" }}
                    >
                      {s.start_time
                        ? `${s.start_time.slice(0, 5)}${end ? ` → ${end}` : ""}`
                        : "Heure non définie"}
                      {total ? ` · ${total} min` : ""}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
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
                        <span className="chip">
                          {INTENSITY[s.intensity] ?? s.intensity}
                        </span>
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
                          style={{
                            flex: b.minutes || 1,
                            background: blockColor(b.type),
                          }}
                          title={`${b.name} · ${b.minutes ?? "?"} min`}
                        />
                      ))}
                    </div>
                    <p
                      className="line-clamp-2 text-xs"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {s.blocks
                        .map(
                          (b) =>
                            `${b.name}${b.minutes ? ` (${b.minutes}')` : ""}`,
                        )
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
          })}
        </div>
      )}
    </div>
  );
}
