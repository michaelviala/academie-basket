"use client";

import { useRef, useState, useTransition } from "react";
import { updateLogo, removeLogo, updateBrandColor, updateBackgroundColor, updateSidebarColor } from "@/app/(app)/administration/actions";
import { contrastRatio } from "@/lib/color";

const BRAND_PRESETS = ["#ff6a1f", "#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#06b6d4"];

const BG_PRESETS: { name: string; value: string }[] = [
  { name: "Défaut", value: "#0e0f12" },
  { name: "Anthracite", value: "#141414" },
  { name: "Marine nuit", value: "#0a0f1f" },
  { name: "Bordeaux nuit", value: "#1a0a0f" },
  { name: "Vert nuit", value: "#071a12" },
];

const SIDEBAR_PRESETS: { name: string; value: string }[] = [
  { name: "Défaut", value: "#16181d" },
  { name: "Noir", value: "#0a0a0c" },
  { name: "Marine", value: "#0d1326" },
  { name: "Bordeaux", value: "#220d12" },
  { name: "Vert forêt", value: "#0b2118" },
  { name: "Assorti au fond", value: "match-bg" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-3 text-xs font-bold uppercase tracking-widest"
      style={{ color: "var(--text-faint)" }}
    >
      {children}
    </div>
  );
}

export function BrandingForm({
  currentLogoUrl,
  currentColor,
  currentBgColor,
  currentSidebarColor,
}: {
  currentLogoUrl: string | null;
  currentColor: string;
  currentBgColor: string;
  currentSidebarColor: string;
}) {
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl);
  const [color, setColor] = useState(currentColor);
  const [bgColor, setBgColor] = useState(currentBgColor);
  const [sidebarColor, setSidebarColor] = useState(currentSidebarColor);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleLogoSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateLogo(formData);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Logo mis à jour." });
        const file = formData.get("logo") as File | null;
        if (file) setLogoUrl(URL.createObjectURL(file));
        formRef.current?.reset();
      }
    });
  }

  function handleRemoveLogo() {
    setMessage(null);
    startTransition(async () => {
      const result = await removeLogo();
      if (result?.error) setMessage({ type: "error", text: result.error });
      else {
        setLogoUrl(null);
        setMessage({ type: "success", text: "Logo retiré." });
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
    });
  }

  function handleBgSubmit(next: string) {
    setBgColor(next);
    setMessage(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("bg_color", next);
      const result = await updateBackgroundColor(fd);
      if (result?.error) setMessage({ type: "error", text: result.error });
    });
  }

  function handleSidebarSubmit(next: string) {
    const resolved = next === "match-bg" ? bgColor : next;
    setSidebarColor(resolved);
    setMessage(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("sidebar_color", resolved);
      const result = await updateSidebarColor(fd);
      if (result?.error) setMessage({ type: "error", text: result.error });
    });
  }

  const buttonTextRatio = contrastRatio("#ffffff", color);
  const accentOnBgRatio = contrastRatio(color, bgColor);
  const navTextRatio = contrastRatio("#f4f5f7", sidebarColor);

  return (
    <div className="card space-y-8">
      <div>
        <h2 className="mb-1 font-semibold">Identité visuelle</h2>
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          Personnalise le logo et les couleurs affichés dans toute l&apos;application.
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

      {/* LOGO */}
      <div>
        <SectionTitle>Logo</SectionTitle>
        <div className="flex items-center gap-5">
          <div
            className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full"
            style={{ background: "var(--surf-2)", border: "2px solid var(--border)" }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo actuel" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl">🏀</span>
            )}
          </div>
          <div>
            <div className="flex gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary" disabled={isPending}>
                ↑ Remplacer
              </button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  disabled={isPending}
                  className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}
                >
                  🗑 Retirer
                </button>
              )}
            </div>
            <p className="mt-2 text-xs" style={{ color: "var(--text-faint)" }}>
              PNG ou SVG, fond transparent de préférence. 2 Mo max.
            </p>
          </div>
          <form ref={formRef} action={handleLogoSubmit} className="hidden">
            <input
              ref={fileInputRef}
              type="file"
              name="logo"
              accept="image/*"
              onChange={(e) => e.target.form && handleLogoSubmit(new FormData(e.target.form))}
            />
          </form>
        </div>
      </div>

      {/* COULEURS */}
      <div>
        <SectionTitle>Couleurs</SectionTitle>

        <p className="mb-2 text-xs" style={{ color: "var(--text-faint)" }}>
          Couleur principale
        </p>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {BRAND_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleColorSubmit(c)}
              className="h-8 w-8 rounded-full"
              style={{ background: c, border: c === color ? "2px solid var(--text)" : "2px solid transparent", boxShadow: "0 0 0 1px var(--border)" }}
              aria-label={`Utiliser la couleur ${c}`}
            />
          ))}
          <span className="mx-1 text-xs" style={{ color: "var(--text-faint)" }}>
            Perso
          </span>
          <input
            type="color"
            value={color}
            onChange={(e) => handleColorSubmit(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
          />
          <span className="font-mono text-xs" style={{ color: "var(--text-dim)" }}>
            {color.toUpperCase()}
          </span>
        </div>

        <p className="mb-2 text-xs" style={{ color: "var(--text-faint)" }}>
          Fond de l&apos;application
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {BG_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => handleBgSubmit(preset.value)}
              className="rounded-lg px-3 py-2 text-xs font-medium"
              style={{
                background: preset.value,
                color: "#f4f5f7",
                border: preset.value === bgColor ? "1px solid var(--brand)" : "1px solid var(--border)",
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>

        <p className="mb-2 text-xs" style={{ color: "var(--text-faint)" }}>
          Couleur du menu
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {SIDEBAR_PRESETS.map((preset) => {
            const resolvedValue = preset.value === "match-bg" ? bgColor : preset.value;
            const isActive = resolvedValue === sidebarColor;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => handleSidebarSubmit(preset.value)}
                className="rounded-lg px-3 py-2 text-xs font-medium"
                style={{
                  background: resolvedValue,
                  color: "#f4f5f7",
                  border: isActive ? "1px solid var(--brand)" : "1px solid var(--border)",
                }}
              >
                {preset.name}
              </button>
            );
          })}
          <span className="mx-1 text-xs" style={{ color: "var(--text-faint)" }}>
            Perso
          </span>
          <input
            type="color"
            value={sidebarColor}
            onChange={(e) => handleSidebarSubmit(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
          />
          <span className="font-mono text-xs" style={{ color: "var(--text-dim)" }}>
            {sidebarColor.toUpperCase()}
          </span>
        </div>

        <div className="flex flex-col gap-1 text-xs">
          <span style={{ color: buttonTextRatio >= 4.5 ? "#4ade80" : "#f87171" }}>
            {buttonTextRatio >= 4.5 ? "✓" : "✕"} Texte des boutons : {buttonTextRatio.toFixed(1)}:1 (min. 4,5:1)
          </span>
          <span style={{ color: accentOnBgRatio >= 3 ? "#4ade80" : "#f87171" }}>
            {accentOnBgRatio >= 3 ? "✓" : "✕"} Couleur sur le fond : {accentOnBgRatio.toFixed(1)}:1 (min. 3:1)
          </span>
          <span style={{ color: navTextRatio >= 4.5 ? "#4ade80" : "#f87171" }}>
            {navTextRatio >= 4.5 ? "✓" : "✕"} Texte du menu : {navTextRatio.toFixed(1)}:1 (min. 4,5:1)
          </span>
        </div>
      </div>
    </div>
  );
}
