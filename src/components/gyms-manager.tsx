"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGym, updateGym, deleteGym } from "@/app/(app)/administration/actions";

type Gym = { id: string; name: string; address: string | null; courts: number; notes: string | null };

function GymForm({ gym, onDone, onError }: { gym?: Gym; onDone: () => void; onError: (m: string) => void }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  function submit(fd: FormData) {
    start(async () => {
      const r = gym ? await updateGym(gym.id, fd) : await createGym(fd);
      if (r?.error) onError(r.error);
      else {
        router.refresh();
        onDone();
      }
    });
  }
  return (
    <form action={submit} className="grid gap-2 rounded-lg p-3 sm:grid-cols-2" style={{ background: "var(--surf-2)" }}>
      <div>
        <label className="label">Nom *</label>
        <input className="input" name="name" defaultValue={gym?.name} required />
      </div>
      <div>
        <label className="label">Nombre de terrains</label>
        <input className="input" name="courts" type="number" min={1} max={20} defaultValue={gym?.courts ?? 1} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Adresse</label>
        <input className="input" name="address" defaultValue={gym?.address ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Notes (accès, clés, vestiaires…)</label>
        <input className="input" name="notes" defaultValue={gym?.notes ?? ""} />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={pending} className="btn-primary">{gym ? "Enregistrer" : "Ajouter la salle"}</button>
        <button type="button" onClick={onDone} className="btn-secondary">Annuler</button>
      </div>
    </form>
  );
}

export function GymsManager({ initialGyms }: { initialGyms: Gym[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function remove(g: Gym) {
    if (!confirm(`Supprimer « ${g.name} » ?`)) return;
    setError(null);
    start(async () => {
      const r = await deleteGym(g.id);
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Salles & gymnases ({initialGyms.length})</h2>
        {editing !== "new" && (
          <button className="btn-secondary" onClick={() => { setError(null); setEditing("new"); }}>+ Ajouter une salle</button>
        )}
      </div>
      {error && (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>{error}</p>
      )}
      {editing === "new" && <GymForm onDone={() => setEditing(null)} onError={setError} />}
      <div className="space-y-2">
        {initialGyms.map((g) =>
          editing === g.id ? (
            <GymForm key={g.id} gym={g} onDone={() => setEditing(null)} onError={setError} />
          ) : (
            <div key={g.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">
                  {g.name} <span className="badge">{g.courts} terrain{g.courts > 1 ? "s" : ""}</span>
                </p>
                {g.address && <p style={{ color: "var(--text-faint)" }}>{g.address}</p>}
                {g.notes && <p className="text-xs" style={{ color: "var(--text-faint)" }}>{g.notes}</p>}
              </div>
              <div className="flex shrink-0 gap-3 text-xs">
                <button type="button" onClick={() => { setError(null); setEditing(g.id); }}>Modifier</button>
                <button type="button" disabled={pending} onClick={() => remove(g)} style={{ color: "#f87171" }}>Supprimer</button>
              </div>
            </div>
          )
        )}
        {initialGyms.length === 0 && <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucune salle enregistrée.</p>}
      </div>
    </div>
  );
}
