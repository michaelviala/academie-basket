"use client";

import { useMemo, useState, useTransition } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const COMMON_TESTS = [
  { type: "Sprint 20m", unit: "s" },
  { type: "Détente verticale (CMJ)", unit: "cm" },
  { type: "Agilité (T-test)", unit: "s" },
  { type: "Yo-Yo Intermittent", unit: "niveau" },
];

type Test = {
  id: string;
  test_type: string;
  result: number;
  unit: string;
  test_date: string;
  comment: string | null;
};

export function PhysicalTests({
  playerId,
  tests,
  addAction,
  deleteAction,
}: {
  playerId: string;
  tests: Test[];
  addAction: (playerId: string, formData: FormData) => Promise<void>;
  deleteAction: (playerId: string, testId: string) => Promise<{ error?: string; success?: boolean }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const testTypes = useMemo(() => Array.from(new Set(tests.map((t) => t.test_type))), [tests]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const activeType = selectedType ?? testTypes[0] ?? null;

  const latestByType = useMemo(() => {
    const map = new Map<string, Test[]>();
    for (const t of tests) {
      const list = map.get(t.test_type) ?? [];
      list.push(t);
      map.set(t.test_type, list);
    }
    for (const list of map.values()) list.sort((a, b) => (a.test_date < b.test_date ? 1 : -1));
    return map;
  }, [tests]);

  const chartData = useMemo(() => {
    if (!activeType) return [];
    const rows = (latestByType.get(activeType) ?? []).slice().sort((a, b) => (a.test_date < b.test_date ? -1 : 1));
    return rows.map((t) => ({ date: t.test_date, value: t.result }));
  }, [activeType, latestByType]);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addAction(playerId, formData);
        setShowForm(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
      }
    });
  }

  function handleDelete(testId: string) {
    startTransition(async () => {
      await deleteAction(playerId, testId);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs" style={{ color: "var(--text-faint)" }}>
          {tests.length} test{tests.length > 1 ? "s" : ""} enregistré{tests.length > 1 ? "s" : ""}
        </div>
        <button type="button" className="btn-secondary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Annuler" : "+ Nouveau test"}
        </button>
      </div>

      {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}

      {showForm && (
        <form action={(fd) => handleSubmit(fd)} className="grid gap-3 rounded-lg p-3 sm:grid-cols-4" style={{ background: "var(--surf-2, #1c1f26)" }}>
          <input className="input sm:col-span-2" name="test_type" list="test-type-options" placeholder="Type de test" required />
          <datalist id="test-type-options">
            {COMMON_TESTS.map((t) => <option key={t.type} value={t.type} />)}
          </datalist>
          <input className="input" type="number" step="0.01" name="result" placeholder="Résultat" required />
          <input className="input" name="unit" placeholder="Unité (s, cm, niveau...)" required />
          <input className="input sm:col-span-2" type="date" name="test_date" />
          <input className="input sm:col-span-2" name="comment" placeholder="Commentaire (optionnel)" />
          <button className="btn-primary sm:col-span-4" type="submit" disabled={isPending}>Enregistrer le test</button>
        </form>
      )}

      {/* Tuiles : dernière valeur par type de test */}
      {latestByType.size > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(latestByType.size, 5)}, minmax(0, 1fr))` }}>
          {Array.from(latestByType.entries()).map(([type, rows]) => {
            const last = rows[0];
            const prev = rows[1];
            const delta = prev ? last.result - prev.result : null;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className="rounded-lg p-3 text-center"
                style={{
                  background: activeType === type ? "rgba(255,106,31,0.12)" : "var(--surf-2, #1c1f26)",
                  border: activeType === type ? "1px solid var(--brand)" : "1px solid var(--border)",
                }}
              >
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>{type}</p>
                <p className="mt-1 text-xl font-bold">{last.result} <span className="text-xs font-normal" style={{ color: "var(--text-faint)" }}>{last.unit}</span></p>
                {delta !== null && (
                  <p className="mt-0.5 text-xs" style={{ color: delta === 0 ? "var(--text-faint)" : delta > 0 ? "#4ade80" : "#f87171" }}>
                    {delta > 0 ? "▲" : delta < 0 ? "▼" : "▬"} {delta !== 0 ? Math.abs(delta).toFixed(2) : "stable"}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Graphe de progression */}
      {activeType && chartData.length > 0 && (
        <div className="rounded-lg p-4" style={{ background: "var(--surf-2, #1c1f26)" }}>
          <p className="mb-2 text-sm font-semibold">Progression — {activeType}</p>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--text-faint)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-faint)" }} />
                <Tooltip contentStyle={{ background: "var(--surf, #16181d)", border: "1px solid var(--border)", fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke="#ff6a1f" strokeWidth={2} dot={{ r: 4, fill: "#ff6a1f", stroke: "var(--surf-2, #1c1f26)", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Historique complet */}
      {tests.length > 0 && (
        <div className="overflow-hidden rounded-lg" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
                <th className="px-3 py-2">Test</th>
                <th className="px-3 py-2">Résultat</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Commentaire</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {tests
                .slice()
                .sort((a, b) => (a.test_date < b.test_date ? 1 : -1))
                .map((t) => (
                  <tr key={t.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="px-3 py-2">{t.test_type}</td>
                    <td className="px-3 py-2">{t.result} {t.unit}</td>
                    <td className="px-3 py-2">{t.test_date}</td>
                    <td className="px-3 py-2" style={{ color: "var(--text-faint)" }}>{t.comment ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" disabled={isPending} onClick={() => handleDelete(t.id)} style={{ color: "#f87171" }}>🗑</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tests.length === 0 && !showForm && (
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucun test physique enregistré pour l&apos;instant.</p>
      )}
    </div>
  );
}
