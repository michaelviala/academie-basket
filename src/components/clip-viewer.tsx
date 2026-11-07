"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { VideoStage, type StageApi } from "@/components/video-stage";
import { SystemCourt } from "@/components/system-court";
import { activeDrawing, drawShapes, type Drawing } from "@/lib/drawings";
import { ballBetween, holder, holderBall, interpolate, type TokenPosition } from "@/lib/systems";
import { fmtT, type VideoSourceInfo } from "@/lib/videos";
import type { ClipComment } from "@/lib/clip-tags";

type Seq = { label: string; positions: TokenPosition[] };
const SEGMENT_SECONDS = 1.7;
const SPEEDS = [1, 0.5, 0.25];
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function ClipViewer({
  source,
  start,
  end,
  comments,
  audioUrls,
  drawings,
  system,
  systemStep,
  compare,
  nav,
  compareHref,
  leaveHref,
  editHref,
  canEdit,
  clipId,
}: {
  clipId: string;
  source: VideoSourceInfo;
  start: number;
  end: number;
  comments: ClipComment[];
  audioUrls: Record<string, string>;
  drawings: Drawing[];
  system: { id: string; name: string; sequences: Seq[] } | null;
  systemStep: number;
  compare: boolean;
  nav: { title: string; index: number; total: number; prev: string | null; next: string | null } | null;
  compareHref: string;
  leaveHref: string;
  editHref: string;
  canEdit: boolean;
}) {
  const api = useRef<StageApi | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [time, setTime] = useState(start);
  const [paused, setPaused] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [loop, setLoop] = useState(true);
  const [muted, setMuted] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [anim, setAnim] = useState(false);
  const [pAnim, setPAnim] = useState(Math.min(systemStep, Math.max(0, (system?.sequences.length ?? 1) - 1)));
  const loopRef = useRef(loop);
  const prevT = useRef<number | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const mountedAt = useRef(0);

  const dur = Math.max(0.1, end - start);
  const f = clamp((time - start) / dur, 0, 1);

  useEffect(() => {
    loopRef.current = loop;
  });

  const playAudio = useCallback(
    (path: string) => {
      const url = audioUrls[path];
      if (!url) return;
      audioEl.current?.pause();
      const a = new Audio(url);
      audioEl.current = a;
      a.play().catch(() => setMsg("Lecture audio impossible."));
    },
    [audioUrls],
  );

  /* ---------- lecture : sondage régulier ---------- */
  useEffect(() => {
    mountedAt.current = Date.now();
    const id = setInterval(() => {
      const h = api.current;
      if (!h) return;
      let t = h.getTime();
      const playing = !h.paused();
      if (playing && !holdTimer.current) {
        const prev = prevT.current;
        // arrêt sur image des dessins
        const hit =
          prev !== null && t - prev < 2
            ? drawings.find((d) => d.t > prev && d.t <= t + 0.001 && d.hold !== 0)
            : undefined;
        if (hit) {
          h.pause();
          h.seek(hit.t);
          t = hit.t;
          if (hit.hold > 0)
            holdTimer.current = setTimeout(() => {
              holdTimer.current = null;
              if (api.current?.paused()) api.current.play();
            }, hit.hold * 1000);
        } else if (prev !== null) {
          for (const c of comments) if (c.audio && c.t > prev && c.t <= t) playAudio(c.audio);
        }
        if (!hit && t >= end - 0.05) {
          if (loopRef.current) {
            h.seek(start);
            t = start;
          } else {
            h.pause();
            h.seek(end);
            t = end;
          }
        }
      }
      if (t < start - 0.5) {
        h.seek(start);
        t = start;
      }
      prevT.current = t;
      setTime(t);
      setPaused(h.paused());
    }, 80);
    return () => {
      clearInterval(id);
      if (holdTimer.current) clearTimeout(holdTimer.current);
      audioEl.current?.pause();
    };
  }, [start, end, drawings, comments, playAudio]);

  /* démarrage : placement au début du clip puis lecture */
  useEffect(() => {
    const t = setTimeout(() => {
      api.current?.seek(start);
      api.current?.play();
    }, 900);
    return () => clearTimeout(t);
  }, [start]);

  useEffect(() => {
    let m = false;
    try {
      m = localStorage.getItem("academie-mute") === "1";
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => {
      setMuted(m);
      api.current?.setMuted(m);
    }, 800);
    return () => clearTimeout(t);
  }, []);

  /* ---------- dessins ---------- */
  const shown = activeDrawing(drawings, time, paused);
  const redrawRef = useRef<() => void>(() => {});
  useEffect(() => {
    redrawRef.current = () => {
      const c = canvasRef.current;
      if (c) drawShapes(c, api.current?.aspect() ?? 16 / 9, shown?.shapes ?? null);
    };
    redrawRef.current();
  });
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => redrawRef.current());
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  /* ---------- commandes ---------- */
  const seek = useCallback((t: number) => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    prevT.current = null;
    api.current?.seek(t);
    setTime(t);
  }, []);
  const togglePlay = useCallback(() => {
    const h = api.current;
    if (!h) return;
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (h.paused()) {
      if (h.getTime() >= end - 0.1) seek(start);
      h.play();
    } else h.pause();
  }, [end, start, seek]);
  function cycleSpeed() {
    const i = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(i);
    api.current?.setRate(SPEEDS[i]);
  }
  function toggleMute() {
    const m = !muted;
    setMuted(m);
    api.current?.setMuted(m);
    try {
      localStorage.setItem("academie-mute", m ? "1" : "0");
    } catch {
      /* ignore */
    }
  }
  function fullscreen() {
    const el = box.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else el.requestFullscreen?.().catch(() => setMsg("Plein écran indisponible ici."));
  }
  function scrub(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const go = (x: number) => seek(start + clamp((x - r.left) / r.width, 0, 1) * dur);
    go(e.clientX);
    const mv = (ev: PointerEvent) => go(ev.clientX);
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select,[contenteditable]")) return;
      const k = e.key.toLowerCase();
      const cur = api.current?.getTime() ?? 0;
      if (k === " ") { e.preventDefault(); togglePlay(); }
      else if (k === "arrowleft") { e.preventDefault(); seek(Math.max(start, cur - (e.shiftKey ? 1 : 3))); }
      else if (k === "arrowright") { e.preventDefault(); seek(Math.min(end, cur + (e.shiftKey ? 1 : 3))); }
      else if (k === "m") toggleMute();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------- système ---------- */
  const seqs = system?.sequences ?? [];
  const n = seqs.length;
  const last = Math.max(0, n - 1);
  useEffect(() => {
    if (!anim) return;
    let raf = 0;
    let prev: number | null = null;
    let p = pAnim >= last - 0.001 ? 0 : pAnim;
    const step = (now: number) => {
      const dt = prev === null ? 0 : (now - prev) / 1000;
      prev = now;
      p += dt / SEGMENT_SECONDS;
      if (p >= last) {
        setPAnim(last);
        setAnim(false);
        return;
      }
      setPAnim(p);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim, last]);

  const p = compare ? f * last : pAnim;
  const idx = Math.min(last, Math.round(p));
  const atRest = Math.abs(p - idx) < 0.001;
  const i0 = Math.min(Math.max(0, last - 1), Math.floor(p));
  const ff = p - i0;
  const moving = n > 1 && !atRest;
  const curSeq = seqs[idx];
  const shownPos = moving ? interpolate(seqs[i0].positions, seqs[i0 + 1].positions, ff, true) : (curSeq?.positions ?? []);
  const ball = moving ? ballBetween(seqs[i0].positions, seqs[i0 + 1].positions, ff, true) : holderBall(curSeq?.positions ?? []);
  const previous = atRest && idx > 0 ? seqs[idx - 1].positions : null;
  const segment = moving ? { from: seqs[i0].positions, to: seqs[i0 + 1].positions } : null;
  const ph = segment ? holder(segment.from) : previous ? holder(previous) : null;
  const ch = segment ? holder(segment.to) : curSeq ? holder(curSeq.positions) : null;
  const pass = ph && ch && ph.label !== ch.label ? { from: { x: ph.x, y: ph.y }, to: { x: ch.x, y: ch.y } } : null;

  const caption = comments.find((c) => c.text && time >= c.t && time <= c.t + clamp(c.text.split(/\s+/).length * 0.42, 3, 10));
  const btn = "btn-secondary !px-3 !py-1.5 text-sm";

  return (
    <div className={`grid gap-4 ${system ? "xl:grid-cols-[minmax(0,1fr)_420px]" : ""}`}>
      <div className="min-w-0 space-y-3">
        <div ref={box} className="relative bg-black">
          <VideoStage key={source.id} source={source} start={start} controls={false} apiRef={api} />
          {source.kind === "file" && (
            <button
              type="button"
              aria-label="Lecture / pause"
              className="absolute inset-0 h-full w-full cursor-pointer"
              onClick={togglePlay}
            />
          )}
          <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
          {caption && (
            <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
              <span className="max-w-full rounded-lg bg-black/75 px-3 py-1.5 text-center text-sm text-white">
                <b className="mr-2 text-[10px] uppercase tracking-wider" style={{ color: "var(--brand)" }}>Coach</b>
                {caption.text}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-primary !px-3 !py-1.5" onClick={togglePlay} aria-label="Lecture / pause">
            {paused ? "▶" : "⏸"}
          </button>
          <button className={btn} onClick={() => { seek(start); api.current?.play(); }} aria-label="Rejouer">↺</button>
          <div
            className="relative h-2 min-w-24 flex-1 cursor-pointer touch-none rounded"
            style={{ background: "var(--border)" }}
            onPointerDown={scrub}
            role="slider"
            aria-label="Position dans le clip"
            aria-valuemin={0}
            aria-valuemax={Math.round(dur)}
            aria-valuenow={Math.round(time - start)}
          >
            <i className="absolute inset-y-0 left-0 rounded" style={{ width: `${f * 100}%`, background: "var(--brand)" }} />
            {comments.map((c, i) => (
              <span key={i} className="absolute -top-1 h-4 w-[3px] rounded bg-white" style={{ left: `${clamp((c.t - start) / dur, 0, 1) * 100}%` }} />
            ))}
            {drawings.map((d) => (
              <span key={d.id} className="absolute -bottom-1 h-2 w-[3px] rounded" style={{ background: "#FFD23F", left: `${clamp((d.t - start) / dur, 0, 1) * 100}%` }} />
            ))}
          </div>
          <span className="font-mono text-xs">{fmtT(time - start, true)} / {fmtT(dur)}</span>
          <button className={btn} onClick={toggleMute} aria-pressed={muted} aria-label="Son (M)">{muted ? "🔇" : "🔊"}</button>
          <button className={btn} onClick={cycleSpeed} aria-label="Vitesse">{String(SPEEDS[speedIdx]).replace(".", ",")}×</button>
          <button className={btn} onClick={() => setLoop((l) => !l)} aria-pressed={loop} style={loop ? { borderColor: "var(--brand)", color: "var(--brand)" } : undefined}>Boucle</button>
          <button className={btn} onClick={fullscreen} aria-label="Plein écran">⛶</button>
        </div>
        {msg && <p className="text-xs" style={{ color: "var(--text-faint)" }} aria-live="polite">{msg}</p>}

        <div className="flex flex-wrap items-center gap-2">
          {nav && (
            <>
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>{nav.title} · {nav.index}/{nav.total}</span>
              {nav.prev && <Link className={btn} href={nav.prev}>← Précédent</Link>}
              {nav.next && <Link className={btn} href={nav.next}>Suivant →</Link>}
            </>
          )}
          <span className="flex-1" />
          {system && (
            <Link className={btn} href={compare ? leaveHref : compareHref} replace scroll={false}>
              {compare ? "Quitter la comparaison" : "⇄ Comparer au système"}
            </Link>
          )}
          {canEdit && <Link className={btn} href={editHref}>✂ Modifier</Link>}
        </div>

        <section className="card space-y-2">
          <h2 className="font-semibold">Commentaires du coach</h2>
          {comments.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-faint)" }}>Pas de commentaire sur ce clip.</p>
          ) : (
            <ul className="space-y-1.5">
              {comments.map((c, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg p-2.5 text-sm" style={{ background: "var(--surf-2)" }}>
                  {c.audio && (
                    <button className="btn-primary !px-2.5 !py-1 text-xs" aria-label="Écouter le commentaire" onClick={() => playAudio(c.audio!)}>▶</button>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs" style={{ color: "var(--text-faint)" }}>à {fmtT(Math.max(0, c.t - start))} du clip</span>
                    « {c.text || "Commentaire audio"} »
                  </span>
                  <button className={btn} onClick={() => { seek(Math.max(start, c.t - 1)); api.current?.play(); }}>Voir</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {system && (
        <section className="card h-fit space-y-3" data-clip={clipId}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">{system.name}</h2>
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>Séquence {idx + 1}/{n}</span>
          </div>
          <div className="mx-auto w-full max-w-[520px]">
            <SystemCourt positions={shownPos} ball={ball} previous={previous} segment={segment} pass={pass} curve />
          </div>
          <div className="flex items-center gap-2">
            {!compare && (
              <button className="btn-primary !px-3 !py-1.5 text-sm" disabled={n < 2} onClick={() => setAnim((a) => !a)}>
                {anim ? "⏸ Pause" : "▶ Animer"}
              </button>
            )}
            <span className="min-w-0 flex-1 truncate text-sm" style={{ color: "var(--text-faint)" }}>{curSeq?.label}</span>
            <Link className="btn-secondary !px-3 !py-1.5 text-sm" href={`/systemes?id=${system.id}`}>Ouvrir</Link>
          </div>
          {compare && (
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
              Le système avance au rythme du clip ({fmtT(dur)}) : lecture, ralenti et curseur pilotent les deux.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
