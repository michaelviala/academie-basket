"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const EVAL_TYPES = ["technique", "tactique", "physique", "mental"] as const;
type EvalType = (typeof EVAL_TYPES)[number];

const EVAL_TYPE_LABELS: Record<EvalType, string> = {
  technique: "Technique",
  tactique: "Tactique",
  physique: "Physique",
  mental: "Mental",
};

// Validated against --surf (#16181d, dark) for 4 fixed categorical series — see dataviz skill.
const EVAL_TYPE_COLORS: Record<EvalType, string> = {
  technique: "#3987e5", // blue
  tactique: "#d95926", // orange
  physique: "#199e70", // aqua
  mental: "#c98500", // yellow
};

type Evaluation = {
  evaluation_type: string;
  score: number;
  evaluated_at: string;
};

type ChartPoint = { date: string } & Partial<Record<EvalType, number>>;

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function quarterOf(dateStr: string): { year: number; q: number } {
  const d = new Date(`${dateStr}T00:00:00`);
  return { year: d.getFullYear(), q: Math.floor(d.getMonth() / 3) + 1 };
}

function quarterKey(dateStr: string): string {
  const { year, q } = quarterOf(dateStr);
  return `${year}-${q}`;
}

function quarterLabel(key: string): string {
  const [year, q] = key.split("-");
  return `T${q} ${year}`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey: EvalType; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{ background: "var(--surf-2)", border: "1px solid var(--border)" }}
    >
      <p className="mb-1 font-semibold" style={{ color: "var(--text)" }}>
        {label ? formatDate(label) : ""}
      </p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-1.5" style={{ color: "var(--text-dim)" }}>
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {EVAL_TYPE_LABELS[p.dataKey]} : <span style={{ color: "var(--text)" }}>{p.value.toFixed(1)}</span>
        </p>
      ))}
    </div>
  );
}

export function PlayerEvaluationChart({ evaluations }: { evaluations: Evaluation[] }) {
  const [activeType, setActiveType] = useState<EvalType | null>(null);
  const [quarter, setQuarter] = useState("");

  const quarterOptions = useMemo(() => {
    const keys = new Set<string>();
    evaluations.forEach((e) => keys.add(quarterKey(e.evaluated_at)));
    return Array.from(keys).sort((a, b) => {
      const [ay, aq] = a.split("-").map(Number);
      const [by, bq] = b.split("-").map(Number);
      return by === ay ? bq - aq : by - ay;
    });
  }, [evaluations]);

  const filteredEvaluations = useMemo(
    () => (quarter ? evaluations.filter((e) => quarterKey(e.evaluated_at) === quarter) : evaluations),
    [evaluations, quarter]
  );

  const { data, typesWithData } = useMemo(() => {
    const byDateType = new Map<string, Map<EvalType, number[]>>();
    filteredEvaluations.forEach((e) => {
      const type = e.evaluation_type as EvalType;
      if (!EVAL_TYPES.includes(type)) return;
      const dateMap = byDateType.get(e.evaluated_at) ?? new Map<EvalType, number[]>();
      const scores = dateMap.get(type) ?? [];
      scores.push(Number(e.score));
      dateMap.set(type, scores);
      byDateType.set(e.evaluated_at, dateMap);
    });

    const sortedDates = Array.from(byDateType.keys()).sort((a, b) => a.localeCompare(b));
    const points: ChartPoint[] = sortedDates.map((date) => {
      const dateMap = byDateType.get(date)!;
      const point: ChartPoint = { date };
      EVAL_TYPES.forEach((t) => {
        const scores = dateMap.get(t);
        if (scores && scores.length > 0) {
          point[t] = scores.reduce((s, v) => s + v, 0) / scores.length;
        }
      });
      return point;
    });

    const present = EVAL_TYPES.filter((t) => filteredEvaluations.some((e) => e.evaluation_type === t));

    return { data: points, typesWithData: present };
  }, [filteredEvaluations]);

  // Progression par rubrique (premier -> dernier score sur la période filtrée), pour les chips de filtre.
  const deltaByType = useMemo(() => {
    const result = new Map<EvalType, { delta: number; latest: number } | null>();
    EVAL_TYPES.forEach((t) => {
      const rows = filteredEvaluations
        .filter((e) => e.evaluation_type === t)
        .sort((a, b) => a.evaluated_at.localeCompare(b.evaluated_at));
      if (rows.length === 0) {
        result.set(t, null);
        return;
      }
      const first = Number(rows[0].score);
      const last = Number(rows[rows.length - 1].score);
      result.set(t, { delta: last - first, latest: last });
    });
    return result;
  }, [filteredEvaluations]);

  const linesToRender = activeType ? [activeType] : typesWithData;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveType(null)}
          className="rounded-full px-3 py-1.5 text-xs font-medium"
          style={{
            background: activeType === null ? "var(--brand)" : "var(--surf-2)",
            color: activeType === null ? "#fff" : "var(--text-dim)",
            border: "1px solid var(--border)",
          }}
        >
          Toutes les courbes
        </button>
        {EVAL_TYPES.map((t) => {
          const isActive = activeType === t;
          const d = deltaByType.get(t);
          const arrow = !d ? "" : d.delta > 0.05 ? "▲" : d.delta < -0.05 ? "▼" : "▬";
          const arrowColor = !d ? "var(--text-faint)" : d.delta > 0.05 ? "var(--green)" : d.delta < -0.05 ? "#f87171" : "var(--text-faint)";
          return (
            <button
              key={t}
              type="button"
              onClick={() => setActiveType(isActive ? null : t)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
              style={{
                background: isActive ? "var(--surf-2)" : "var(--surf-2)",
                color: "var(--text-dim)",
                border: isActive ? `1px solid ${EVAL_TYPE_COLORS[t]}` : "1px solid var(--border)",
              }}
            >
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: EVAL_TYPE_COLORS[t] }} />
              {EVAL_TYPE_LABELS[t]}
              {d && (
                <span style={{ color: arrowColor }}>
                  {arrow} {d.delta > 0 ? "+" : ""}{d.delta.toFixed(1)}
                </span>
              )}
            </button>
          );
        })}

        {quarterOptions.length > 1 && (
          <select
            className="input ml-auto"
            style={{ width: "auto" }}
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
          >
            <option value="">Toutes les périodes</option>
            {quarterOptions.map((q) => (
              <option key={q} value={q}>{quarterLabel(q)}</option>
            ))}
          </select>
        )}
      </div>

      {data.length === 0 || linesToRender.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>
          {activeType
            ? `Pas encore d'évaluation ${EVAL_TYPE_LABELS[activeType].toLowerCase()} sur cette période.`
            : "Pas encore assez d'évaluations pour tracer une progression."}
        </p>
      ) : (
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: "var(--text-faint)", fontSize: 11 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                tick={{ fill: "var(--text-faint)", fontSize: 11 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
                width={28}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "var(--text-dim)" }}
                formatter={(value) => (
                  <span style={{ color: "var(--text-dim)" }}>{EVAL_TYPE_LABELS[value as EvalType]}</span>
                )}
              />
              {linesToRender.map((t) => (
                <Line
                  key={t}
                  type="monotone"
                  dataKey={t}
                  name={t}
                  stroke={EVAL_TYPE_COLORS[t]}
                  strokeWidth={2}
                  dot={{ r: 4, fill: EVAL_TYPE_COLORS[t], stroke: "var(--surf)", strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: EVAL_TYPE_COLORS[t], stroke: "var(--surf)", strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
