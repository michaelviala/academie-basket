"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type PlanningTraining = {
  id: string;
  date: string;
  start_time: string | null;
  duration_minutes: number | null;
  objective: string | null;
  team_id: string | null;
  coach_id: string | null;
  gym_id: string | null;
  teams: { name: string } | null;
  gyms: { name: string } | null;
};

const PALETTE = ["#f97316", "#38bdf8", "#a78bfa", "#4ade80", "#f472b6", "#facc15", "#fb7185", "#2dd4bf"];
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const HOUR_H = 52;

type Mode = "equipe" | "salle" | "coach";
type Item = { id: string; name: string; courts?: number; color?: string | null };

function key(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function mondayOf(d: Date) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}
function minutes(t: PlanningTraining) {
  const [h, m] = (t.start_time ?? "00:00").split(":").map(Number);
  const start = h * 60 + (m || 0);
  return { start, end: start + (t.duration_minutes ?? 90) };
}
const hhmm = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

export function WeekPlanning({
  trainings,
  teams,
  coaches,
  gyms,
}: {
  trainings: PlanningTraining[];
  teams: Item[];
  coaches: { id: string; full_name: string }[];
  gyms: Item[];
}) {
  const [monday, setMonday] = useState(() => mondayOf(new Date()));
  const [mode, setMode] = useState<Mode>("equipe");

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)),
    [monday]
  );
  const week = useMemo(() => {
    const keys = days.map(key);
    return trainings.filter((t) => keys.includes(t.date) && t.start_time);
  }, [trainings, days]);

  const coachName = useMemo(() => new Map(coaches.map((c) => [c.id, c.full_name])), [coaches]);
  const colorOf = useMemo(() => {
    const list: string[] =
      mode === "equipe" ? teams.map((t) => t.id) : mode === "salle" ? gyms.map((g) => g.id) : coaches.map((c) => c.id);
    const map = new Map<string, string>();
    list.forEach((id, i) => map.set(id, (mode === "equipe" ? teams.find((t) => t.id === id)?.color : null) || PALETTE[i % PALETTE.length]));
    return (t: PlanningTraining) =>
      map.get((mode === "equipe" ? t.team_id : mode === "salle" ? t.gym_id : t.coach_id) ?? "") ?? "#94a3b8";
  }, [mode, teams, gyms, coaches]);
  const legend: Item[] = mode === "equipe" ? teams : mode === "salle" ? gyms : coaches.map((c) => ({ id: c.id, name: c.full_name }));

  // Conflits : même coach en même temps, ou salle utilisée par plus de séances que de terrains.
  const conflicts = useMemo(() => {
    const bad = new Map<string, string[]>();
    const add = (id: string, msg: string) => bad.set(id, [...(bad.get(id) ?? []), msg]);
    const courtsOf = new Map(gyms.map((g) => [g.id, g.courts ?? 1]));
    week.forEach((a) => {
      const ma = minutes(a);
      const overlapping = week.filter((b) => {
        if (b.id === a.id || b.date !== a.date) return false;
        const mb = minutes(b);
        return ma.start < mb.end && mb.start < ma.end;
      });
      if (a.coach_id && overlapping.some((b) => b.coach_id === a.coach_id)) {
        add(a.id, `${coachName.get(a.coach_id) ?? "Coach"} est sur deux séances en même temps`);
      }
      if (a.gym_id) {
        const sameGym = overlapping.filter((b) => b.gym_id === a.gym_id).length + 1;
        const courts = courtsOf.get(a.gym_id) ?? 1;
        if (sameGym > courts) add(a.id, `${a.gyms?.name ?? "Salle"} : ${sameGym} séances pour ${courts} terrain${courts > 1 ? "s" : ""}`);
      }
    });
    return bad;
  }, [week, gyms, coachName]);

  const hours = useMemo(() => {
    let lo = 8, hi = 22;
    week.forEach((t) => {
      const m = minutes(t);
      lo = Math.min(lo, Math.floor(m.start / 60));
      hi = Math.max(hi, Math.ceil(m.end / 60));
    });
    return { lo, hi: Math.min(hi, 24) };
  }, [week]);

  // Colonnes parallèles pour les séances qui se chevauchent dans un même jour.
  function layout(list: PlanningTraining[]) {
    const sorted = [...list].sort((a, b) => minutes(a).start - minutes(b).start);
    const lanes: number[] = [];
    const out = sorted.map((t) => {
      const m = minutes(t);
      let lane = lanes.findIndex((end) => end <= m.start);
      if (lane === -1) { lane = lanes.length; lanes.push(m.end); } else lanes[lane] = m.end;
      return { t, m, lane };
    });
    return out.map((o) => {
      const concurrent = out.filter((p) => p.m.start < o.m.end && o.m.start < p.m.end);
      return { ...o, count: Math.max(...concurrent.map((p) => p.lane + 1)) };
    });
  }

  const todayKey = key(new Date());
  const conflictList = week.filter((t) => conflicts.has(t.id));
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const nbHours = hours.hi - hours.lo;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary" style={{ padding: "4px 10px" }}
            onClick={() => setMonday(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7))}>←</button>
          <h2 className="min-w-[190px] text-center font-semibold">{fmt(days[0])} – {fmt(days[6])} {days[6].getFullYear()}</h2>
          <button type="button" className="btn-secondary" style={{ padding: "4px 10px" }}
            onClick={() => setMonday(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7))}>→</button>
          <button type="button" className="btn-secondary" style={{ padding: "4px 10px", fontSize: 12 }}
            onClick={() => setMonday(mondayOf(new Date()))}>Cette semaine</button>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-faint)" }}>
          Colorer par
          <div className="seg">
            {(["equipe", "salle", "coach"] as Mode[]).map((m) => (
              <button key={m} type="button" className={mode === m ? "active" : ""} onClick={() => setMode(m)}>
                {m === "equipe" ? "Catégorie" : m === "salle" ? "Salle" : "Coach"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {legend.map((l) => (
          <span key={l.id} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-faint)" }}>
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[legend.indexOf(l) % PALETTE.length] }} />
            {l.name}
          </span>
        ))}
      </div>

      {conflictList.length > 0 && (
        <div className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
          <p className="font-semibold">⚠ {conflictList.length} séance(s) en conflit cette semaine</p>
          <ul className="mt-1 list-disc pl-5 text-xs">
            {conflictList.map((t) => (
              <li key={t.id}>
                <Link href={`/seances/${t.id}`} className="underline">
                  {new Date(t.date + "T12:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })} {t.start_time?.slice(0, 5)} {t.teams?.name ?? "Catégorie"}
                </Link>{" "}
                — {conflicts.get(t.id)!.join(" ; ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto">
        <div style={{ minWidth: 760 }}>
          <div className="grid" style={{ gridTemplateColumns: "44px repeat(7, 1fr)" }}>
            <div />
            {days.map((d, i) => (
              <div key={i} className="pb-1 text-center text-[11px] font-bold uppercase tracking-wider"
                style={{ color: key(d) === todayKey ? "var(--brand)" : "var(--text-faint)" }}>
                {DAYS[i]} {d.getDate()}
              </div>
            ))}
          </div>
          <div className="grid" style={{ gridTemplateColumns: "44px repeat(7, 1fr)" }}>
            <div className="relative" style={{ height: nbHours * HOUR_H }}>
              {Array.from({ length: nbHours }, (_, i) => (
                <span key={i} className="absolute right-1 text-[10px]" style={{ top: i * HOUR_H - 6, color: "var(--text-faint)" }}>
                  {hours.lo + i}h
                </span>
              ))}
            </div>
            {days.map((d, di) => {
              const items = layout(week.filter((t) => t.date === key(d)));
              return (
                <div key={di} className="relative"
                  style={{
                    height: nbHours * HOUR_H,
                    borderLeft: "1px solid var(--border)",
                    background: key(d) === todayKey ? "rgba(255,106,31,0.05)" : undefined,
                    backgroundImage: `repeating-linear-gradient(to bottom, var(--border) 0, var(--border) 1px, transparent 1px, transparent ${HOUR_H}px)`,
                  }}>
                  {items.map(({ t, m, lane, count }) => {
                    const c = colorOf(t);
                    const bad = conflicts.has(t.id);
                    return (
                      <Link key={t.id} href={`/seances/${t.id}`}
                        title={`${hhmm(m.start)}–${hhmm(m.end)} ${t.teams?.name ?? ""}${t.gyms ? " · " + t.gyms.name : ""}${t.coach_id ? " · " + (coachName.get(t.coach_id) ?? "") : ""}${bad ? "\n⚠ " + conflicts.get(t.id)!.join(" ; ") : ""}`}
                        className="absolute overflow-hidden rounded px-1 py-0.5 text-[10px] leading-tight"
                        style={{
                          top: ((m.start - hours.lo * 60) / 60) * HOUR_H + 1,
                          height: Math.max(((m.end - m.start) / 60) * HOUR_H - 2, 18),
                          left: `calc(${(lane / count) * 100}% + 1px)`,
                          width: `calc(${100 / count}% - 2px)`,
                          background: `${c}30`,
                          borderLeft: `3px solid ${bad ? "#ef4444" : c}`,
                          outline: bad ? "1.5px solid #ef4444" : undefined,
                          color: "var(--text)",
                        }}>
                        <b>{bad ? "⚠ " : ""}{hhmm(m.start)}</b> {t.teams?.name ?? "Catégorie"}
                        {t.gyms && <div style={{ color: "var(--text-faint)" }}>{t.gyms.name}</div>}
                        {t.coach_id && <div style={{ color: "var(--text-faint)" }}>{coachName.get(t.coach_id)}</div>}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {week.length === 0 && <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucune séance planifiée cette semaine.</p>}
    </div>
  );
}
