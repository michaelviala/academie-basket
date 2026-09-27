"use client";

import { useState, useTransition } from "react";

const STATUS_LABELS: Record<string, string> = {
  en_cours: "En cours",
  en_reprise: "En reprise",
  gueri: "Guéri",
};

const STATUS_COLORS: Record<string, string> = {
  en_cours: "#f87171",
  en_reprise: "#eda100",
  gueri: "#4ade80",
};

type Injury = {
  id: string;
  injury_type: string;
  zone: string | null;
  start_date: string;
  estimated_duration: string | null;
  restrictions: string | null;
  return_protocol: string | null;
  expected_return_date: string | null;
  status: string;
  comment: string | null;
};

export function Injuries({
  playerId,
  injuries,
  declareAction,
  updateAction,
  deleteAction,
}: {
  playerId: string;
  injuries: Injury[];
  declareAction: (playerId: string, formData: FormData) => Promise<void>;
  updateAction: (playerId: string, injuryId: string, formData: FormData) => Promise<void>;
  deleteAction: (playerId: string, injuryId: string) => Promise<{ error?: string; success?: boolean }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(injuries[0]?.id ?? null);

  const selected = injuries.find((i) => i.id === selectedId) ?? injuries[0] ?? null;

  function handleDeclare(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await declareAction(playerId, formData);
        setShowForm(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
      }
    });
  }

  function handleUpdate(injuryId: string, formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updateAction(playerId, injuryId, formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur lors de la mise à jour.");
      }
    });
  }

  function handleDelete(injuryId: string) {
    startTransition(async () => {
      await deleteAction(playerId, injuryId);
      if (selectedId === injuryId) setSelectedId(null);
    });
  }

  const activeCount = injuries.filter((i) => i.status === "en_cours").length;
  const recoveryCount = injuries.filter((i) => i.status === "en_reprise").length;
  const healedCount = injuries.filter((i) => i.status === "gueri").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <span className="badge" style={{ background: "rgba(248,113,113,.14)", color: "#f87171", borderColor: "transparent" }}>{activeCount} en cours</span>
          <span className="badge" style={{ background: "rgba(237,161,0,.14)", color: "#eda100", borderColor: "transparent" }}>{recoveryCount} en reprise</span>
          <span className="badge" style={{ background: "rgba(74,222,128,.14)", color: "#4ade80", borderColor: "transparent" }}>{healedCount} guérie{healedCount > 1 ? "s" : ""}</span>
        </div>
        <button type="button" className="btn-secondary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Annuler" : "+ Déclarer une blessure"}
        </button>
      </div>

      {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}

      {showForm && (
        <form action={(fd) => handleDeclare(fd)} className="grid gap-3 rounded-lg p-3 sm:grid-cols-2" style={{ background: "var(--surf-2, #1c1f26)" }}>
          <input className="input" name="injury_type" placeholder="Type (ex. Entorse)" required />
          <input className="input" name="zone" placeholder="Zone (ex. Cheville droite)" />
          <label className="-mb-1 text-xs sm:col-span-2" style={{ color: "var(--text-faint)" }}>Date de début</label>
          <input className="input" type="date" name="start_date" />
          <input className="input" name="estimated_duration" placeholder="Durée estimée (ex. 3 semaines)" />
          <textarea className="input sm:col-span-2" name="restrictions" placeholder="Restrictions" rows={2} />
          <textarea className="input sm:col-span-2" name="return_protocol" placeholder="Protocole de reprise" rows={2} />
          <label className="-mb-1 text-xs sm:col-span-2" style={{ color: "var(--text-faint)" }}>Date de retour prévue</label>
          <input className="input sm:col-span-2" type="date" name="expected_return_date" />
          <input className="input sm:col-span-2" name="comment" placeholder="Commentaire" />
          <button className="btn-primary sm:col-span-2" type="submit" disabled={isPending}>Déclarer la blessure</button>
        </form>
      )}

      {injuries.length === 0 && !showForm && (
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucune blessure enregistrée.</p>
      )}

      {injuries.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="overflow-hidden rounded-lg" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Zone</th>
                  <th className="px-3 py-2">Depuis</th>
                  <th className="px-3 py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {injuries.map((inj) => (
                  <tr
                    key={inj.id}
                    onClick={() => setSelectedId(inj.id)}
                    className="cursor-pointer"
                    style={{
                      borderTop: "1px solid var(--border)",
                      background: selected?.id === inj.id ? "var(--surf-2, #1c1f26)" : "transparent",
                    }}
                  >
                    <td className="px-3 py-2 font-medium">{inj.injury_type}</td>
                    <td className="px-3 py-2">{inj.zone ?? "—"}</td>
                    <td className="px-3 py-2">{inj.start_date}</td>
                    <td className="px-3 py-2">
                      <span className="badge" style={{ background: "transparent", color: STATUS_COLORS[inj.status] ?? "var(--text-faint)", borderColor: STATUS_COLORS[inj.status] ?? "var(--border)" }}>
                        {STATUS_LABELS[inj.status] ?? inj.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected && (
            <form
              key={selected.id}
              action={(fd) => handleUpdate(selected.id, fd)}
              className="space-y-3 rounded-lg p-4"
              style={{ background: "var(--surf-2, #1c1f26)" }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{selected.injury_type} — {selected.zone ?? "zone non précisée"}</p>
                <button type="button" disabled={isPending} onClick={() => handleDelete(selected.id)} style={{ color: "#f87171" }}>🗑</button>
              </div>
              <select className="input" name="status" defaultValue={selected.status}>
                <option value="en_cours">En cours</option>
                <option value="en_reprise">En reprise</option>
                <option value="gueri">Guéri</option>
              </select>
              <textarea className="input" name="restrictions" placeholder="Restrictions" defaultValue={selected.restrictions ?? ""} rows={2} />
              <textarea className="input" name="return_protocol" placeholder="Protocole de reprise" defaultValue={selected.return_protocol ?? ""} rows={2} />
              <label className="-mb-1 block text-xs" style={{ color: "var(--text-faint)" }}>Date de retour prévue</label>
              <input className="input" type="date" name="expected_return_date" defaultValue={selected.expected_return_date ?? ""} />
              <input className="input" name="comment" placeholder="Commentaire" defaultValue={selected.comment ?? ""} />
              <button className="btn-primary w-full" type="submit" disabled={isPending}>Mettre à jour</button>
            </form>
          )}
        </div>
      )}

      <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>
        Visible uniquement par : administrateur, directeur sportif, préparateur physique.
      </p>
    </div>
  );
}
