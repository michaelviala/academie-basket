"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type CalendarTraining = {
  id: string;
  date: string;
  start_time: string | null;
  duration_minutes: number | null;
  objective: string | null;
  intensity: string | null;
  team_id: string | null;
  coach_id: string | null;
  gym_id: string | null;
  teams: { name: string } | null;
  gyms: { name: string } | null;
};

const TEAM_COLORS = [
  "#f97316", // orange (brand)
  "#38bdf8", // sky
  "#a78bfa", // violet
  "#4ade80", // green
  "#f472b6", // pink
  "#facc15", // yellow
  "#fb7185", // rose
  "#2dd4bf", // teal
];

const WEEKDAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function TrainingCalendar({
  trainings,
  teams,
  coaches,
  gyms,
}: {
  trainings: CalendarTraining[];
  teams: { id: string; name: string }[];
  coaches: { id: string; full_name: string }[];
  gyms: { id: string; name: string }[];
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [teamFilter, setTeamFilter] = useState("");
  const [coachFilter, setCoachFilter] = useState("");
  const [gymFilter, setGymFilter] = useState("");

  const teamColor = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach((t, i) => map.set(t.id, TEAM_COLORS[i % TEAM_COLORS.length]));
    return map;
  }, [teams]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarTraining[]>();
    trainings
      .filter((t) => !teamFilter || t.team_id === teamFilter)
      .filter((t) => !coachFilter || t.coach_id === coachFilter)
      .filter((t) => !gymFilter || t.gym_id === gymFilter)
      .forEach((t) => {
        const list = map.get(t.date) ?? [];
        list.push(t);
        list.sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
        map.set(t.date, list);
      });
    return map;
  }, [trainings, teamFilter, coachFilter, gymFilter]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const cells = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    // JS getDay(): 0=Sun..6=Sat. We want Monday-first: 0=Mon..6=Sun.
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const prevM = month === 0 ? 11 : month - 1;
    const prevY = month === 0 ? year - 1 : year;
    const nextM = month === 11 ? 0 : month + 1;
    const nextY = month === 11 ? year + 1 : year;

    const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    const list: { day: number; y: number; m: number; inMonth: boolean }[] = [];

    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - firstWeekday + 1;
      if (dayNumber < 1) {
        list.push({ day: daysInPrevMonth + dayNumber, y: prevY, m: prevM, inMonth: false });
      } else if (dayNumber > daysInMonth) {
        list.push({ day: dayNumber - daysInMonth, y: nextY, m: nextM, inMonth: false });
      } else {
        list.push({ day: dayNumber, y: year, m: month, inMonth: true });
      }
    }
    return list;
  }, [year, month]);

  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: "4px 10px" }}
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            ←
          </button>
          <h2 className="min-w-[160px] text-center font-semibold">
            {MONTH_LABELS[month]} {year}
          </h2>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: "4px 10px" }}
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          >
            →
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: "4px 10px", fontSize: 12 }}
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
          >
            Aujourd&apos;hui
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {teams.length > 0 && (
            <select
              className="input"
              style={{ width: "auto" }}
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="">Toutes les équipes</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          {coaches.length > 0 && (
            <select
              className="input"
              style={{ width: "auto" }}
              value={coachFilter}
              onChange={(e) => setCoachFilter(e.target.value)}
            >
              <option value="">Tous les coachs</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          )}
          {gyms.length > 0 && (
            <select
              className="input"
              style={{ width: "auto" }}
              value={gymFilter}
              onChange={(e) => setGymFilter(e.target.value)}
            >
              <option value="">Tous les gymnases</option>
              {gyms.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {teams.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {teams.map((t) => (
            <span key={t.id} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-faint)" }}>
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: teamColor.get(t.id) }}
              />
              {t.name}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_SHORT.map((w) => (
          <div
            key={w}
            className="pb-1 text-center text-[11px] font-bold uppercase tracking-wider"
            style={{ color: "var(--text-faint)" }}
          >
            {w}
          </div>
        ))}
        {cells.map((c, i) => {
          const key = toKey(c.y, c.m, c.day);
          const items = byDate.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div
              key={i}
              className="min-h-[92px] rounded-lg p-1.5"
              style={{
                background: c.inMonth ? "var(--surf-2)" : "transparent",
                border: isToday ? "1.5px solid var(--brand)" : "1px solid var(--border)",
                opacity: c.inMonth ? 1 : 0.4,
              }}
            >
              <p
                className="mb-1 text-right text-xs"
                style={{ color: isToday ? "var(--brand)" : "var(--text-faint)", fontWeight: isToday ? 700 : 400 }}
              >
                {c.day}
              </p>
              <div className="space-y-1">
                {items.slice(0, 3).map((t) => (
                  <Link
                    key={t.id}
                    href={`/entrainements/${t.id}`}
                    className="block truncate rounded px-1.5 py-0.5 text-[11px] leading-tight"
                    style={{
                      background: `${teamColor.get(t.team_id ?? "") ?? "var(--brand)"}22`,
                      color: "var(--text)",
                      borderLeft: `2.5px solid ${teamColor.get(t.team_id ?? "") ?? "var(--brand)"}`,
                    }}
                    title={`${t.start_time ?? ""} ${t.teams?.name ?? "Équipe"} — ${t.objective ?? "Séance"}`}
                  >
                    {t.start_time ? `${t.start_time.slice(0, 5)} ` : ""}
                    {t.teams?.name ?? "Équipe"}
                  </Link>
                ))}
                {items.length > 3 && (
                  <p className="px-1.5 text-[10px]" style={{ color: "var(--text-faint)" }}>
                    +{items.length - 3} autre(s)
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
