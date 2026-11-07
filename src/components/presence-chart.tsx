"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type PresencePoint = { label: string; rate: number; sessions: number };

export function PresenceChart({ data }: { data: PresencePoint[] }) {
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "var(--text-faint)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} unit="%" tick={{ fill: "var(--text-faint)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            contentStyle={{ background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }}
            formatter={(v, _n, item) => [`${v}% (${(item.payload as PresencePoint).sessions} présences saisies)`, "Présence"]}
          />
          <Bar dataKey="rate" fill="var(--brand)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
