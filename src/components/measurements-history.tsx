"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { deleteMeasurement } from "@/app/(app)/joueurs/[id]/actions";

export type Measurement = { id: string; measured_at: string; height_cm: number | null; weight_kg: number | null; wingspan_cm: number | null };

const SERIES = [
  { key: "height_cm", label: "Taille", unit: "cm", color: "#3987e5" },
  { key: "weight_kg", label: "Poids", unit: "kg", color: "#d95926" },
  { key: "wingspan_cm", label: "Envergure", unit: "cm", color: "#199e70" },
] as const;

const fmt = (d: string) => new Date(d + "T12:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" });

export function MeasurementsHistory({ playerId, measurements, canEdit }: { playerId: string; measurements: Measurement[]; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const asc = [...measurements].sort((a, b) => a.measured_at.localeCompare(b.measured_at));

  if (asc.length === 0) {
    return <p className="text-sm text-faint">Aucune mesure enregistrée. Utilise « Enregistrer une nouvelle mesure » en haut de la fiche.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {SERIES.map((s) => {
          const pts = asc.filter((m) => m[s.key] !== null).map((m) => ({ label: fmt(m.measured_at), v: Number(m[s.key]) }));
          const gain = pts.length > 1 ? pts[pts.length - 1].v - pts[0].v : null;
          return (
            <div key={s.key} className="rounded-lg p-3" style={{ background: "var(--surf-2)" }}>
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-faint">{s.label}</p>
                {gain !== null && (
                  <p className="text-xs font-semibold" style={{ color: "var(--green)" }}>
                    {gain >= 0 ? "+" : ""}{Math.round(gain * 10) / 10} {s.unit} depuis le début
                  </p>
                )}
              </div>
              <div style={{ width: "100%", height: 130 }}>
                <ResponsiveContainer>
                  <LineChart data={pts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "var(--text-faint)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fill: "var(--text-faint)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }}
                      formatter={(v) => [`${v} ${s.unit}`, s.label]}
                    />
                    <Line type="monotone" dataKey="v" stroke={s.color} strokeWidth={2.5} dot={{ r: 3, fill: s.color }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-faint">
              <th className="py-1 pr-3">Date</th><th className="pr-3">Taille</th><th className="pr-3">Poids</th><th className="pr-3">Envergure</th><th />
            </tr>
          </thead>
          <tbody>
            {[...asc].reverse().map((m) => (
              <tr key={m.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td className="py-1.5 pr-3">{fmt(m.measured_at)}</td>
                <td className="pr-3">{m.height_cm ?? "—"}{m.height_cm ? " cm" : ""}</td>
                <td className="pr-3">{m.weight_kg ?? "—"}{m.weight_kg ? " kg" : ""}</td>
                <td className="pr-3">{m.wingspan_cm ?? "—"}{m.wingspan_cm ? " cm" : ""}</td>
                <td className="text-right">
                  {canEdit && (
                    <button
                      type="button"
                      disabled={pending}
                      className="text-xs"
                      style={{ color: "#f87171" }}
                      onClick={() => {
                        if (confirm("Supprimer cette mesure ?")) start(async () => { await deleteMeasurement(playerId, m.id); router.refresh(); });
                      }}
                    >
                      Supprimer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
