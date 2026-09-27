"use client";

import { useMemo } from "react";
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
  const { data, typesWithData } = useMemo(() => {
    const byDateType = new Map<string, Map<EvalType, number[]>>();
    evaluations.forEach((e) => {
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

    const present = EVAL_TYPES.filter((t) => evaluations.some((e) => e.evaluation_type === t));

    return { data: points, typesWithData: present };
  }, [evaluations]);

  if (data.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-faint)" }}>
        Pas encore assez d&apos;évaluations pour tracer une progression.
      </p>
    );
  }

  return (
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
          {typesWithData.map((t) => (
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
  );
}
