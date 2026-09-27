"use client";

import { useState, useTransition } from "react";

export function CoachContactForm({
  coachId,
  initialPhone,
  initialAddress,
  action,
}: {
  coachId: string;
  initialPhone: string;
  initialAddress: string;
  action: (coachId: string, formData: FormData) => Promise<void>;
}) {
  const [phone, setPhone] = useState(initialPhone);
  const [address, setAddress] = useState(initialAddress);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await action(coachId, formData);
      setSaved(true);
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label">Téléphone</label>
        <input
          className="input"
          name="phone"
          placeholder="06 12 34 56 78"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Adresse</label>
        <input
          className="input"
          name="address"
          placeholder="12 rue du Stade, 30000 Nîmes"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn-secondary" type="submit" disabled={isPending}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {saved && !isPending && (
          <span className="text-xs" style={{ color: "var(--green)" }}>Coordonnées mises à jour.</span>
        )}
      </div>
    </form>
  );
}
