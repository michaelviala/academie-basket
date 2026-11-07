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
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState(false);
  const meter = useRef<{ stream: MediaStream; ctx: AudioContext; raf: number } | null>(null);
  const rec = useRef<Rec | null>(null);
  const active = useRef(false);
  const base = useRef("");
  const finals = useRef("");

  const stopMeter = useCallback(() => {
    const m = meter.current;
    if (!m) return;
    cancelAnimationFrame(m.raf);
    m.stream.getTracks().forEach((t) => t.stop());
    void m.ctx.close().catch(() => {});
    meter.current = null;
    setLevel(0);
  }, []);

  const startMeter = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      const m = { stream, ctx, raf: 0 };
      const tick = () => {
        an.getByteTimeDomainData(buf);
        let peak = 0;
        for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
        setLevel(Math.min(1, peak / 64));
        m.raf = requestAnimationFrame(tick);
      };
      m.raf = requestAnimationFrame(tick);
      meter.current = m;
    } catch {
      setError("Aucun micro accessible : vérifie l'autorisation et le micro choisi dans Chrome.");
    }
  }, []);

  const stop = useCallback(() => {
    active.current = false;
    stopMeter();
    setListening(false);
    try {
      rec.current?.stop();
    } catch {
      /* ignore */
    }
    rec.current = null;
  }, [stopMeter]);

  const start = useCallback(() => {
    const C = ctor();
    if (!C) return;
    setError(null);
    setHeard(false);
    void startMeter();
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
      setHeard(true);
      setError(null);
      setText(join(base.current, fin, inter));
    };
    r.onerror = (e) => {
      const msgs: Record<string, string> = {
        "not-allowed": "Micro refusé : autorise l'accès au micro dans le navigateur.",
        "service-not-allowed": "Reconnaissance vocale bloquée par le navigateur ou le réseau.",
        network: "Le service de reconnaissance vocale du navigateur est injoignable (réseau ou pare-feu).",
        "audio-capture": "Aucun micro détecté.",
        "language-not-supported": "Le français n'est pas disponible pour la dictée sur ce navigateur.",
        "no-speech": "Aucune voix détectée : vérifie que le bon micro est choisi (icône à gauche de l'adresse) et parle plus près.",
      };
      if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "language-not-supported") denied = true;
      if (e.error !== "aborted") setError(msgs[e.error] ?? `Dictée interrompue (${e.error}).`);
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
  }, [getText, setText, stop, startMeter]);

  useEffect(() => stop, [stop]);
  return { supported, listening, error, level, heard, start, stop };
}
