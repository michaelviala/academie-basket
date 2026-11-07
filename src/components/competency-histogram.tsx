"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type CompetencyEval = { skill: string; score: number; date: string };

type Row = { skill: string; last: number; previous: number | null };

/** Histogramme horizontal : dernière note de chaque compétence (et la précédente, plus pâle, pour voir l'évolution). */
export function CompetencyHistogram({ evals, color }: { evals: CompetencyEval[]; color: string }) {
  const bySkill = new Map<string, CompetencyEval[]>();
  for (const e of evals) bySkill.set(e.skill, [...(bySkill.get(e.skill) ?? []), e]);
  const rows: Row[] = [...bySkill.entries()]
    .map(([skill, list]) => {
      const sorted = [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
      return { skill, last: sorted[0].score, previous: sorted[1]?.score ?? null };
    })
    .sort((a, b) => b.last - a.last || a.skill.localeCompare(b.skill));

  if (rows.length === 0) return <p className="text-sm text-faint">Aucune compétence évaluée dans cette rubrique.</p>;
  const hasPrev = rows.some((r) => r.previous !== null);

  return (
    <div>
      <div style={{ width: "100%", height: rows.length * (hasPrev ? 40 : 28) + 40 }}>
        <ResponsiveContainer>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 0 }} barCategoryGap={hasPrev ? 8 : 6}>
            <CartesianGrid stroke="var(--border)" horizontal={false} />
            <XAxis type="number" domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fill: "var(--text-faint)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="skill" width={190} tick={{ fill: "var(--text-dim)", fontSize: 12 }} axisLine={false} tickLine={false} interval={0} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              contentStyle={{ background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }}
              formatter={(v, name) => [`${v} / 10`, name === "last" ? "Dernière note" : "Note précédente"]}
            />
            {hasPrev && <Bar dataKey="previous" name="previous" fill={color} fillOpacity={0.35} radius={[0, 4, 4, 0]} barSize={9} />}
            <Bar dataKey="last" name="last" fill={color} radius={[0, 4, 4, 0]} barSize={hasPrev ? 11 : 14}>
              <LabelList dataKey="last" position="right" style={{ fill: "var(--text)", fontSize: 12, fontWeight: 700 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {hasPrev && (
        <p className="mt-1 text-[11px] text-faint">Barre pleine : dernière note · barre pâle : note précédente.</p>
      )}
    </div>
  );
}
