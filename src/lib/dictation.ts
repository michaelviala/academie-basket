"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type Ctor = new () => Rec;

function ctor(): Ctor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Dictée vocale (français) : le texte reconnu est ajouté à la suite du texte existant. */
export function useDictation(getText: () => string, setText: (t: string) => void) {
  const supported = useSyncExternalStore(() => () => {}, () => !!ctor(), () => false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Rec | null>(null);
  const active = useRef(false);
  const base = useRef("");
  const finals = useRef("");

  const stop = useCallback(() => {
    active.current = false;
    setListening(false);
    try {
      rec.current?.stop();
    } catch {
      /* ignore */
    }
    rec.current = null;
  }, []);

  const start = useCallback(() => {
    const C = ctor();
    if (!C) return;
    setError(null);
    const r = new C();
    r.lang = "fr-FR";
    r.continuous = true;
    r.interimResults = true;
    base.current = getText().trim();
    finals.current = "";
    let denied = false;
    const join = (...p: string[]) => p.map((x) => x.trim()).filter(Boolean).join(" ");
    r.onresult = (ev) => {
      let fin = "", inter = "";
      for (let i = 0; i < ev.results.length; i++) {
        const x = ev.results[i];
        if (x.isFinal) fin += x[0].transcript;
        else inter += x[0].transcript;
      }
      finals.current = fin;
      setText(join(base.current, fin, inter));
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        denied = true;
        setError("Micro refusé : autorise l'accès au micro dans le navigateur.");
      } else if (e.error === "network") setError("Dictée indisponible (connexion).");
    };
    r.onend = () => {
      if (active.current && !denied) {
        base.current = join(base.current, finals.current);
        finals.current = "";
        try {
          r.start();
        } catch {
          stop();
        }
      } else stop();
    };
    try {
      r.start();
      rec.current = r;
      active.current = true;
      setListening(true);
    } catch {
      setError("Impossible de démarrer la dictée.");
    }
  }, [getText, setText, stop]);

  useEffect(() => stop, [stop]);
  return { supported, listening, error, start, stop };
}
