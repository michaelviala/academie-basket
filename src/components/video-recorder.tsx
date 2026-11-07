"use client";

import { useEffect, useRef, useState } from "react";

/** Caméra intégrée : filme jusqu'à `maxSeconds` secondes avec un décompte affiché sur l'image, arrêt automatique à 0. */
export function VideoRecorder({
  maxSeconds,
  onRecorded,
  onCancel,
  onUnavailable,
}: {
  maxSeconds: number;
  onRecorded: (file: File) => void;
  onCancel: () => void;
  /** Caméra impossible (refus, navigateur…) : l'appelant bascule sur l'appareil photo du téléphone. */
  onUnavailable: (reason: string) => void;
}) {
  const videoEl = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunks = useRef<Blob[]>([]);
  const cb = useRef({ onUnavailable });
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [left, setLeft] = useState(maxSeconds);
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  useEffect(() => {
    cb.current = { onUnavailable };
  });

  useEffect(() => {
    let cancelled = false;
    async function open() {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        cb.current.onUnavailable(window.isSecureContext ? "ce navigateur ne permet pas l'enregistrement vidéo." : "la page n'est pas en HTTPS.");
        return;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        const v = videoEl.current;
        if (v) {
          v.srcObject = s;
          await v.play().catch(() => {});
        }
        setReady(true);
      } catch (e) {
        if (!cancelled)
          cb.current.onUnavailable(
            e instanceof DOMException && e.name === "NotAllowedError"
              ? "accès refusé. Autorise la caméra et le micro pour ce site (icône à gauche de l'adresse → Autorisations)."
              : `${e instanceof DOMException ? e.name : "erreur"} : ${e instanceof Error ? e.message : "caméra introuvable"}.`,
          );
      }
    }
    void open();
    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };
  }, [facing]);

  function start() {
    const s = stream.current;
    if (!s) return;
    const mime = ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((m) =>
      MediaRecorder.isTypeSupported(m),
    );
    let r: MediaRecorder;
    try {
      r = new MediaRecorder(s, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 3_000_000 });
    } catch {
      return onUnavailable("Enregistrement impossible sur ce navigateur.");
    }
    chunks.current = [];
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      const type = r.mimeType || mime || "video/webm";
      const base = type.split(";")[0] || "video/webm";
      const blob = new Blob(chunks.current, { type: base });
      onRecorded(new File([blob], base.includes("mp4") ? "video.mp4" : "video.webm", { type: base }));
    };
    rec.current = r;
    r.start(500);
    setRecording(true);
    setLeft(maxSeconds);
    const t0 = Date.now();
    timer.current = setInterval(() => {
      const rest = maxSeconds - (Date.now() - t0) / 1000;
      if (rest <= 0) {
        setLeft(0);
        stop();
      } else setLeft(rest);
    }, 100);
  }
  function stop() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRecording(false);
    if (rec.current && rec.current.state !== "inactive") rec.current.stop();
  }

  const shown = Math.max(0, Math.ceil(left));
  const warn = recording && left <= 3;

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Filmer">
      <div className="relative min-h-0 flex-1">
        <video ref={videoEl} className="h-full w-full object-contain" muted playsInline autoPlay />
        <div
          className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full px-5 py-2 font-mono text-4xl font-bold tabular-nums"
          style={{ background: warn ? "rgba(229,72,77,.9)" : "rgba(0,0,0,.6)" }}
          aria-live="off"
        >
          {recording ? `● ${shown}` : `${maxSeconds} s max`}
        </div>
        {recording && (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/20">
            <i className="block h-full" style={{ width: `${((maxSeconds - left) / maxSeconds) * 100}%`, background: warn ? "#e5484d" : "var(--brand)" }} />
          </div>
        )}
        {!ready && <p className="absolute inset-0 flex items-center justify-center text-sm">Ouverture de la caméra…</p>}
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <button type="button" className="btn-secondary" onClick={() => { stop(); onCancel(); }}>Annuler</button>
        {recording ? (
          <button type="button" onClick={stop} aria-label="Arrêter" className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white">
            <span className="h-6 w-6 rounded-sm" style={{ background: "#e5484d" }} />
          </button>
        ) : (
          <button type="button" onClick={start} disabled={!ready} aria-label="Démarrer l'enregistrement" className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white disabled:opacity-40">
            <span className="h-11 w-11 rounded-full" style={{ background: "#e5484d" }} />
          </button>
        )}
        <button type="button" className="btn-secondary" disabled={recording} onClick={() => { setReady(false); setFacing((f) => (f === "environment" ? "user" : "environment")); }} aria-label="Changer de caméra">⟲</button>
      </div>
    </div>
  );
}
