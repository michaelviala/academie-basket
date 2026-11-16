"use client";

import { MONTH_SHORT, SEASON_MONTHS, type GuidePeriod } from "@/lib/technical-guide";

const tint = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;
const idx = (m: number) => SEASON_MONTHS.indexOf(m as (typeof SEASON_MONTHS)[number]);

/** Période du cycle annuel (carnet technique) couvrant un mois donné (1-12). */
export function periodForMonth(periods: GuidePeriod[], month: number): GuidePeriod | null {
  const i = idx(month);
  if (i < 0) return null;
  return periods.find((p) => idx(p.start_month) <= i && i <= idx(p.end_month)) ?? null;
}

/**
 * Bandeau des cycles du carnet technique dans le calendrier :
 * frise août → juin avec le mois affiché repéré, puis la période en cours avec son objectif.
 */
export function CycleBand({ periods, month }: { periods: GuidePeriod[]; month: number }) {
  const current = periodForMonth(periods, month);
  return (
    <div className="space-y-2 rounded-xl p-3" style={{ background: "var(--surf-2)", border: "1px solid var(--border)" }}>
      <div className="overflow-x-auto">
        <div className="grid min-w-[520px] gap-1" style={{ gridTemplateColumns: `repeat(${SEASON_MONTHS.length}, minmax(0, 1fr))` }}>
          {SEASON_MONTHS.map((m) => (
            <div
              key={m}
              className="text-center text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: m === month ? "var(--brand)" : "var(--text-faint)" }}
            >
              {MONTH_SHORT[m]}
              {m === month && <span className="block text-[8px] leading-none">▼</span>}
            </div>
          ))}
          {periods.map((p, i) => {
            const s = idx(p.start_month), e = idx(p.end_month);
            if (s < 0 || e < s) return null;
            const active = p === current;
            return (
              <div
                key={i}
                className="min-w-0 truncate rounded px-2 py-1 text-[11px] font-bold uppercase"
                title={`${p.name} · ${p.dates}`}
                style={{
                  gridColumn: `${s + 1} / ${e + 2}`,
                  gridRow: 2,
                  background: tint(p.color, active ? 32 : 16),
                  border: `1px solid ${tint(p.color, active ? 80 : 45)}`,
                  color: p.color,
                  opacity: active ? 1 : 0.75,
                }}
              >
                {p.name.split(":")[0]}
              </div>
            );
          })}
        </div>
      </div>
      {current ? (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          <span className="font-bold uppercase" style={{ color: current.color }}>{current.name}</span>
          {current.dates ? ` · ${current.dates}` : ""}{current.duration ? ` · ${current.duration}` : ""}
          {current.objective ? <> — {current.objective}</> : null}
        </p>
      ) : (
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>Aucune période du cycle annuel pour ce mois.</p>
      )}
    </div>
  );
}
