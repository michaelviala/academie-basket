"use client";

import { useRef, useState, useTransition } from "react";
import { createGym, deleteGym } from "@/app/(app)/administration/actions";

type Gym = { id: string; name: string; address: string | null };

export function GymsManager({ initialGyms }: { initialGyms: Gym[] }) {
  const [gyms, setGyms] = useState(initialGyms);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createGym(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setGyms((prev) => [
          ...prev,
          { id: crypto.randomUUID(), name: String(formData.get("name")), address: (formData.get("address") as string) || null },
        ]);
        formRef.current?.reset();
      }
    });
  }

  function handleDelete(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteGym(id);
      if (result?.error) setError(result.error);
      else setGyms((prev) => prev.filter((g) => g.id !== id));
    });
  }

  return (
    <div className="card">
      <h2 className="mb-3 font-semibold">Gymnases</h2>
      {error && (
        <p className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
          {error}
        </p>
      )}
      <div className="mb-3 space-y-1">
        {gyms.map((g) => (
          <div key={g.id} className="flex items-center justify-between text-sm">
            <span>
              {g.name}
              {g.address && <span style={{ color: "var(--text-faint)" }}> — {g.address}</span>}
            </span>
            <button
              type="button"
              onClick={() => handleDelete(g.id)}
              disabled={isPending}
              className="text-xs"
              style={{ color: "#f87171" }}
            >
              Retirer
            </button>
          </div>
        ))}
        {gyms.length === 0 && <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucun gymnase enregistré.</p>}
      </div>
      <form ref={formRef} action={handleCreate} className="flex gap-2">
        <input className="input" name="name" placeholder="Nom du gymnase" required />
        <input className="input" name="address" placeholder="Adresse (optionnel)" />
        <button type="submit" disabled={isPending} className="btn-secondary whitespace-nowrap">
          + Ajouter
        </button>
      </form>
    </div>
  );
}
