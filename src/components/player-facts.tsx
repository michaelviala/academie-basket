"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePlayerMeasures } from "@/app/(app)/joueurs/[id]/actions";

type Props = {
  playerId: string;
  canEdit: boolean;
  entry: string;
  height: number | null;
  weight: number | null;
  wingspan: number | null;
  hand: string | null;
  previousClub: string | null;
};

export function PlayerFacts({ playerId, canEdit, entry, height, weight, wingspan, hand, previousClub }: Props) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const facts = [
    { label: "Taille", value: height ? `${height} cm` : "—" },
    { label: "Poids", value: weight ? `${weight} kg` : "—" },
    { label: "Envergure", value: wingspan ? `${wingspan} cm` : "—" },
    { label: "Main", value: hand ?? "—" },
    { label: "Entrée", value: entry },
    { label: "Ancien club", value: previousClub ?? "—" },
  ];

  if (editing) {
    return (
      <form
        className="mt-6 grid grid-cols-2 gap-3 rounded-lg p-3 sm:grid-cols-3 lg:grid-cols-6"
        style={{ background: "var(--surf)", border: "1px solid var(--border)" }}
        action={(fd) =>
          start(async () => {
            const r = await updatePlayerMeasures(playerId, fd);
            if (r.error) setError(r.error);
            else { setError(null); setEditing(false); router.refresh(); }
          })
        }
      >
        <div><label className="label">Date de la mesure</label><input className="input" type="date" name="measured_at" defaultValue={today} required /></div>
        <div><label className="label">Taille (cm)</label><input className="input" name="height_cm" inputMode="decimal" defaultValue={height ?? ""} /></div>
        <div><label className="label">Poids (kg)</label><input className="input" name="weight_kg" inputMode="decimal" defaultValue={weight ?? ""} /></div>
        <div><label className="label">Envergure (cm)</label><input className="input" name="wingspan_cm" inputMode="decimal" defaultValue={wingspan ?? ""} /></div>
        <div>
          <label className="label">Main</label>
          <select className="input" name="dominant_hand" defaultValue={hand ?? ""}>
            <option value="">—</option>
            <option value="droite">Droite</option>
            <option value="gauche">Gauche</option>
            <option value="ambidextre">Ambidextre</option>
          </select>
        </div>
        <div><label className="label">Ancien club</label><input className="input" name="previous_club" defaultValue={previousClub ?? ""} /></div>
        <div className="col-span-full flex items-center gap-3">
          <button className="btn-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
          <button type="button" className="btn-secondary" onClick={() => { setEditing(false); setError(null); }}>Annuler</button>
          {error && <span className="text-xs" style={{ color: "#f87171" }}>{error}</span>}
        </div>
      </form>
    );
  }

  return (
    <div className="mt-6">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {facts.map((f) => (
          <div key={f.label} className="rounded-lg px-3 py-2" style={{ background: "var(--surf)", border: "1px solid var(--border)" }}>
            <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>{f.label}</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold capitalize">{f.value}</dd>
          </div>
        ))}
      </dl>
      {canEdit && (
        <button type="button" className="mt-2 text-xs font-semibold" style={{ color: "var(--brand)" }} onClick={() => setEditing(true)}>
          ✎ Enregistrer une nouvelle mesure (taille, poids, envergure)
        </button>
      )}
    </div>
  );
}
