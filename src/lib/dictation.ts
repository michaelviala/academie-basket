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

let serverProbe: Promise<boolean> | null = null;
/** La transcription par le serveur est-elle configurée ? (mémorisé, relancé en cas d'échec réseau) */
function serverEnabled(): Promise<boolean> {
  if (!serverProbe)
    serverProbe = fetch("/api/transcribe", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((j: { enabled?: boolean }) => !!j.enabled)
      .catch(() => {
        serverProbe = null;
        return false;
      });
  return serverProbe;
}

/** Dictée vocale (français) : le texte reconnu est ajouté à la suite du texte existant. */
export function useDictation(getText: () => string, setText: (t: string) => void) {
  const getTextRef = useRef(getText);
  useEffect(() => {
    getTextRef.current = getText;
  }, [getText]);
  // le serveur peut transcrire même sans reconnaissance vocale intégrée : on suppose « oui » côté client (MediaRecorder)
  const recordable = useSyncExternalStore(() => () => {}, () => typeof MediaRecorder !== "undefined" || !!ctor(), () => false);
  const supported = recordable;
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [mode, setMode] = useState<"navigateur" | "serveur">("navigateur");
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
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

  const startMeter = useCallback(async (): Promise<MediaStream | null> => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return null;
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
      return stream;
    } catch {
      setError("Aucun micro accessible : vérifie l'autorisation du micro pour ce site.");
      return null;
    }
  }, []);

  const finishServer = useCallback(async () => {
    const mr = recorder.current;
    recorder.current = null;
    if (!mr) return;
    await new Promise<void>((res) => {
      mr.onstop = () => res();
      try {
        if (mr.state !== "inactive") mr.stop();
        else res();
      } catch {
        res();
      }
    });
    const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
    chunks.current = [];
    if (blob.size < 1500) {
      setError("Enregistrement trop court : appuie, parle, puis arrête.");
      return;
    }
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.set("audio", blob);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const j = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok) setError(j.error ?? "Transcription impossible.");
      else if (!j.text) setError("Aucune parole reconnue : parle plus près du micro.");
      else {
        const cur = getTextRef.current().trim();
        setText([cur, j.text].filter(Boolean).join(" "));
        setHeard(true);
      }
    } catch {
      setError("Transcription impossible (connexion perdue ?).");
    } finally {
      setTranscribing(false);
    }
  }, [setText]);

  const stop = useCallback(() => {
    active.current = false;
    stopMeter();
    setListening(false);
    if (recorder.current) void finishServer();
    try {
      rec.current?.stop();
    } catch {
      /* ignore */
    }
    rec.current = null;
  }, [stopMeter, finishServer]);

  const start = useCallback(async () => {
    setError(null);
    setHeard(false);
    if (await serverEnabled()) {
      setMode("serveur");
      const stream = await startMeter();
      if (!stream || typeof MediaRecorder === "undefined") return setError("Enregistrement audio indisponible sur ce navigateur.");
      const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t));
      const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.current.push(e.data);
      };
      mr.start();
      recorder.current = mr;
      setListening(true);
      return;
    }
    setMode("navigateur");
    const C = ctor();
    if (!C) return setError("Dictée vocale indisponible sur ce navigateur.");
    void startMeter();
    const r = new C();
    r.lang = "fr-FR";
    r.continuous = true;
    r.interimResults = true;
    base.current = getTextRef.current().trim();
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
  }, [setText, stop, startMeter]);

  useEffect(() => stop, [stop]);
  return { supported, listening, error, level, heard, transcribing, mode, start, stop };
}
