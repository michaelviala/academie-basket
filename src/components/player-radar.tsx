"use client";

import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";

type Point = { axis: string; current: number | null; previous: number | null };

/** Profil du joueur sur 4 axes (technique, tactique, physique, mental), avec comparaison à la période précédente. */
export function PlayerRadar({ data, accent, hasPrevious }: { data: Point[]; accent: string; hasPrevious: boolean }) {
  const chartData = data.map((d) => ({ axis: d.axis, current: d.current ?? 0, previous: d.previous ?? 0 }));
  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <RadarChart data={chartData} outerRadius="72%">
          <PolarGrid stroke="#2e323c" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: "#9aa0ac", fontSize: 12, fontWeight: 600 }} />
          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
          {hasPrevious && (
            <Radar name="Il y a 3 à 6 mois" dataKey="previous" stroke="#6b7280" strokeDasharray="4 3" fill="#6b7280" fillOpacity={0.08} isAnimationActive={false} />
          )}
          <Radar name="3 derniers mois" dataKey="current" stroke={accent} strokeWidth={2.5} fill={accent} fillOpacity={0.35} isAnimationActive={false} />
          <Legend wrapperStyle={{ fontSize: 12, color: "#9aa0ac" }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
