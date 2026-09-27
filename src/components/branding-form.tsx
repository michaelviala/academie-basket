"use client";

import { useRef, useState, useTransition } from "react";
import { updateLogo, updateBrandColor } from "@/app/(app)/administration/actions";

const PRESET_COLORS = ["#ff6a1f", "#3b82f6", "#22c55e", "#a855f7", "#ef4444", "#f59e0b"];

export function BrandingForm({
  currentLogoUrl,
  currentColor,
}: {
  currentLogoUrl: string | null;
  currentColor: string;
}) {
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl);
  const [color, setColor] = useState(currentColor);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleLogoSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateLogo(formData);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Logo mis à jour." });
        formRef.current?.reset();
        // Re-read the freshly stored value on next load; optimistic preview:
        const file = formData.get("logo") as File | null;
        if (file) setLogoUrl(URL.createObjectURL(file));
      }
    });
  }

  function handleColorSubmit(next: string) {
    setColor(next);
    setMessage(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("brand_color", next);
      const result = await updateBrandColor(fd);
      if (result?.error) setMessage({ type: "error", text: result.error });
      else setMessage({ type: "success", text: "Couleur appliquée." });
    });
  }

  return (
    <div className="card space-y-6">
      <div>
        <h2 className="mb-1 font-semibold">Identité visuelle</h2>
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          Personnalise le logo et la couleur principale affichés dans toute l&apos;application.
        </p>
      </div>

      {message && (
        <p
          className="rounded-lg px-3 py-2 text-sm"
          style={
            message.type === "success"
              ? { background: "rgba(34,197,94,0.12)", color: "#4ade80" }
              : { background: "rgba(239,68,68,0.12)", color: "#f87171" }
          }
        >
          {message.text}
        </p>
      )}

      <div className="flex items-center gap-6">
        <div
          className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg"
          style={{ background: "var(--surf-2)", border: "1px solid var(--border)" }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo actuel" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl">🏀</span>
          )}
        </div>
        <form ref={formRef} action={handleLogoSubmit} className="flex items-center gap-3">
          <input
            type="file"
            name="logo"
            accept="image/*"
            required
            className="text-sm"
            style={{ color: "var(--text-dim)" }}
          />
          <button type="submit" disabled={isPending} className="btn-secondary">
            {isPending ? "Envoi..." : "Changer le logo"}
          </button>
        </form>
      </div>

      <div>
        <label className="label">Couleur principale</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => handleColorSubmit(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded border-0 bg-transparent p-0"
          />
          <span className="font-mono text-sm" style={{ color: "var(--text-dim)" }}>
            {color}
          </span>
          <div className="flex gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleColorSubmit(c)}
                className="h-6 w-6 rounded-full"
                style={{ background: c, border: c === color ? "2px solid white" : "1px solid var(--border)" }}
                aria-label={`Utiliser la couleur ${c}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
