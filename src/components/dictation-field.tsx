"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDictation } from "@/lib/dictation";

/** Champ texte avec bouton micro : le coach dicte au lieu de taper (dictée du navigateur ou transcription serveur). */
export function DictationField({
  name,
  placeholder,
  rows = 2,
  multiline = true,
  className = "",
  disabled = false,
  value,
  onValueChange,
  maxLength = 2000,
}: {
  name?: string;
  placeholder?: string;
  rows?: number;
  multiline?: boolean;
  className?: string;
  disabled?: boolean;
  /** Mode contrôlé (facultatif). */
  value?: string;
  onValueChange?: (v: string) => void;
  maxLength?: number;
}) {
  const [inner, setInner] = useState("");
  const controlled = value !== undefined;
  const text = controlled ? value : inner;
  const set = useCallback(
    (v: string) => {
      if (!controlled) setInner(v);
      onValueChange?.(v);
    },
    [controlled, onValueChange],
  );
  const ref = useRef(text);
  useEffect(() => {
    ref.current = text;
  }, [text]);
  const getText = useCallback(() => ref.current, []);
  const d = useDictation(getText, set);

  const mic = (
    <button
      type="button"
      onClick={() => (d.listening ? d.stop() : void d.start())}
      disabled={disabled || d.transcribing || !d.supported}
      aria-pressed={d.listening}
      aria-label={d.listening ? "Arrêter la dictée" : "Dicter"}
      title={d.supported ? (d.listening ? "Arrêter la dictée" : "Dicter au micro") : "Dictée indisponible sur ce navigateur"}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
      style={{ background: d.listening ? "#e5484d" : "var(--brand)" }}
    >
      {d.transcribing ? "…" : d.listening ? "■" : "🎤"}
    </button>
  );

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-start gap-2">
        {multiline ? (
          <textarea
            className="input min-w-0 flex-1"
            name={name}
            rows={rows}
            placeholder={placeholder}
            value={text}
            maxLength={maxLength}
            disabled={disabled}
            onChange={(e) => set(e.target.value)}
          />
        ) : (
          <input
            className="input min-w-0 flex-1"
            name={name}
            placeholder={placeholder}
            value={text}
            maxLength={maxLength}
            disabled={disabled}
            onChange={(e) => set(e.target.value)}
          />
        )}
        {mic}
      </div>
      {(d.listening || d.transcribing || d.error) && (
        <p className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-faint)" }} aria-live="polite">
          {d.listening && (
            <>
              <span className="inline-block h-2 w-16 overflow-hidden rounded" style={{ background: "var(--border)" }}>
                <i className="block h-full rounded" style={{ width: `${Math.round(d.level * 100)}%`, background: d.level > 0.05 ? "#3BD16F" : "var(--text-faint)" }} />
              </span>
              {d.level <= 0.05
                ? "Aucun son capté…"
                : d.mode === "serveur"
                  ? "Son capté · appuie sur ■ quand tu as fini"
                  : d.heard
                    ? "Texte reconnu ✓"
                    : "Son capté, reconnaissance en cours…"}
            </>
          )}
          {d.transcribing && "Transcription en cours…"}
          {d.error && <span style={{ color: "#f87171" }}>{d.error}</span>}
        </p>
      )}
    </div>
  );
}
