"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { VideoStage, type StageApi } from "@/components/video-stage";
import { PHASES, RESULTS, phaseOf, resultsFor, resultOk, type ClipComment } from "@/lib/clip-tags";
import { fmtT, parseT, type VideoSourceInfo } from "@/lib/videos";
import {
  addQuarter,
  deleteClip,
  deleteQuarter,
  saveClip,
  type ClipInput,
} from "@/app/(app)/videos/actions";

export type EditorClip = {
  id: string;
  title: string;
  start: number;
  end: number;
  phase: string;
  result: string | null;
  playerIds: string[];
  systemId: string | null;
  systemStep: number;
  tags: string;
  shared: boolean;
  comments: ClipComment[];
  canDelete: boolean;
};

type Draft = Omit<EditorClip, "id" | "canDelete"> & { id: string | null; canDelete: boolean };
type Player = { id: string; first_name: string; last_name: string };
type SystemOpt = { id: string; name: string; steps: string[] };
type Quarter = { id: string; t: number };

const ZOOMS = [0, 1200, 300, 60];
const SPEEDS = [0.5, 1, 1.5, 2];
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const emptyDraft = (start: number, end: number): Draft => ({
  id: null, title: "", start, end, phase: "att", result: null, playerIds: [],
  systemId: null, systemStep: 0, tags: "", shared: false, comments: [], canDelete: true,
});

export function VideoEditor({
  source,
  initialClips,
  initialQuarters,
  players,
  systems,
  canEdit,
  openClipId,
}: {
  source: VideoSourceInfo;
  initialClips: EditorClip[];
  initialQuarters: Quarter[];
  players: Player[];
  systems: SystemOpt[];
  canEdit: boolean;
  openClipId: string | null;
}) {
  const api = useRef<StageApi | null>(null);
  const [clips, setClips] = useState<EditorClip[]>(initialClips);
  const [quarters, setQuarters] = useState<Quarter[]>(initialQuarters);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [paused, setPaused] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [muted, setMuted] = useState(false);
  const [inT, setInT] = useState<number | null>(null);
  const [outT, setOutT] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(() => {
    const c = initialClips.find((x) => x.id === openClipId);
    return c ? { ...c } : null;
  });
  const [tab, setTab] = useState<"clip" | "list">("clip");
  const [zoom, setZoom] = useState(0);
  const [v0, setV0] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [cmText, setCmText] = useState("");
  const [, startTransition] = useTransition();
  const stopAt = useRef<number | null>(null);
  const dragging = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const win = useRef({ a: 0, b: 1 });

  const span = ZOOMS[zoom] && ZOOMS[zoom] < dur ? ZOOMS[zoom] : dur || 1;
  const a = span >= (dur || 1) ? 0 : clamp(v0, 0, Math.max(0, dur - span));
  const b = a + span;
  useEffect(() => {
    win.current = { a, b };
  });

  /* ---------- lecteur : sondage régulier ---------- */
  useEffect(() => {
    const id = setInterval(() => {
      const h = api.current;
      if (!h) return;
      const t = h.getTime();
      if (stopAt.current !== null && t >= stopAt.current) {
        h.pause();
        h.seek(stopAt.current);
        stopAt.current = null;
      }
      setTime(t);
      const d = h.duration();
      if (d) setDur((old) => (Math.abs(old - d) > 0.05 ? d : old));
      setPaused(h.paused());
      const { a: wa, b: wb } = win.current;
      if (!dragging.current && !h.paused() && (t > wb || t < wa) && wb - wa < 1e9) {
        setV0(Math.max(0, t - (wb - wa) * 0.3));
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let m = false;
    try {
      m = localStorage.getItem("academie-mute") === "1";
    } catch {
      /* stockage indisponible */
    }
    const t = setTimeout(() => {
      setMuted(m);
      api.current?.setMuted(m);
    }, 800);
    return () => clearTimeout(t);
  }, []);

  const seek = useCallback((t: number) => {
    const h = api.current;
    if (!h) return;
    stopAt.current = null;
    h.seek(clamp(t, 0, h.duration() || t));
    setTime(clamp(t, 0, h.duration() || t));
  }, []);

  const togglePlay = useCallback(() => {
    const h = api.current;
    if (!h) return;
    if (h.paused()) h.play();
    else h.pause();
  }, []);

  function cycleSpeed() {
    const i = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(i);
    api.current?.setRate(SPEEDS[i]);
  }
  const toggleMute = useCallback(() => {
    setMuted((m) => {
      api.current?.setMuted(!m);
      try {
        localStorage.setItem("academie-mute", !m ? "1" : "0");
      } catch {
        /* ignore */
      }
      return !m;
    });
  }, []);

  /* ---------- repères, clips ---------- */
  const markIn = useCallback(() => {
    const t = api.current?.getTime() ?? 0;
    setInT(t);
    setOutT((o) => (o !== null && o <= t ? null : o));
    setDraft((d) => (d && !d.id ? { ...d, start: t } : d));
  }, []);
  const markOut = useCallback(() => {
    const t = api.current?.getTime() ?? 0;
    setOutT(t);
    setInT((i) => (i === null || i >= t ? Math.max(0, t - 8) : i));
    setDraft((d) => (d && !d.id ? { ...d, end: t } : d));
  }, []);

  const newClip = useCallback(() => {
    if (inT === null || outT === null || outT <= inT) {
      setMsg("Marque d'abord le début (I) et la fin (O).");
      return;
    }
    setDraft(emptyDraft(inT, outT));
    setTab("clip");
    setMsg(null);
  }, [inT, outT]);

  const markQuarter = useCallback(() => {
    const t = api.current?.getTime() ?? 0;
    startTransition(async () => {
      const res = await addQuarter(source.id, t);
      if (res.error || !res.id) return setMsg(res.error ?? "Échec.");
      setQuarters((q) => [...q, { id: res.id!, t }].sort((x, y) => x.t - y.t));
      setMsg(`Début de quart-temps marqué à ${fmtT(t)}.`);
    });
  }, [source.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select,[contenteditable]")) return;
      const k = e.key.toLowerCase();
      const cur = api.current?.getTime() ?? 0;
      if (k === " ") { e.preventDefault(); togglePlay(); }
      else if (k === "arrowleft") { e.preventDefault(); seek(cur - (e.shiftKey ? 1 : 5)); }
      else if (k === "arrowright") { e.preventDefault(); seek(cur + (e.shiftKey ? 1 : 5)); }
      else if (k === ",") seek(cur - 1 / 25);
      else if (k === ".") seek(cur + 1 / 25);
      else if (k === "i" && canEdit) markIn();
      else if (k === "o" && canEdit) markOut();
      else if (k === "enter" && canEdit) newClip();
      else if (k === "q" && canEdit) markQuarter();
      else if (k === "m") toggleMute();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seek, markIn, markOut, newClip, markQuarter, toggleMute, canEdit]);

  /* ---------- enregistrement ---------- */
  function toInput(d: Draft): ClipInput {
    return {
      id: d.id ?? undefined, sourceId: source.id, title: d.title, start: d.start, end: d.end,
      phase: d.phase, result: d.result, playerIds: d.playerIds, systemId: d.systemId,
      systemStep: d.systemStep, tags: d.tags, shared: d.shared, comments: d.comments,
    };
  }
  function upsertLocal(d: Draft, id: string) {
    const row: EditorClip = { ...d, id, canDelete: true };
    setClips((all) => {
      const rest = all.filter((c) => c.id !== id);
      return [...rest, row].sort((x, y) => x.start - y.start);
    });
  }
  function persist(d: Draft, immediate = false) {
    if (!d.id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const run = () =>
      startTransition(async () => {
        const res = await saveClip(toInput(d));
        if (res.error) setMsg(res.error);
        else {
          setMsg(null);
          upsertLocal(d, d.id!);
        }
      });
    if (immediate) run();
    else saveTimer.current = setTimeout(run, 600);
  }
  function patch(p: Partial<Draft>, immediate = true) {
    if (!draft || !canEdit) return;
    let next = { ...draft, ...p };
    if (p.phase && !resultOk(p.phase, next.result)) {
      next = { ...next, result: null };
      setMsg("Le résultat ne correspond pas à cette phase : il a été retiré.");
    }
    setDraft(next);
    persist(next, immediate);
  }
  function createDraft() {
    if (!draft || draft.id) return;
    if (draft.end <= draft.start) return setMsg("La fin du clip doit être après le début.");
    const d = { ...draft, title: draft.title.trim() || `${phaseOf(draft.phase).label} · ${fmtT(draft.start)}` };
    startTransition(async () => {
      const res = await saveClip(toInput(d));
      if (res.error || !res.id) return setMsg(res.error ?? "Création impossible.");
      upsertLocal(d, res.id);
      setDraft({ ...d, id: res.id });
      setInT(null);
      setOutT(null);
      setMsg("Clip créé.");
    });
  }
  function quickTag(phase: string) {
    const t = api.current?.getTime() ?? 0;
    const d: Draft = {
      ...emptyDraft(Math.max(0, t - 10), Math.min(dur || t + 1, t + 1)),
      phase,
      title: `${phaseOf(phase).label} · ${fmtT(Math.max(0, t - 10))}`,
    };
    startTransition(async () => {
      const res = await saveClip(toInput(d));
      if (res.error || !res.id) return setMsg(res.error ?? "Échec.");
      upsertLocal(d, res.id);
      setDraft({ ...d, id: res.id });
      setMsg(`Clip créé : ${d.title}`);
    });
  }
  function selectClip(c: EditorClip) {
    setDraft({ ...c });
    setInT(null);
    setOutT(null);
    setTab("clip");
    seek(c.start);
  }
  function playClip(d: Draft) {
    seek(d.start);
    stopAt.current = d.end;
    api.current?.play();
  }
  function removeClip() {
    if (!draft?.id || !confirm("Supprimer ce clip ?")) return;
    const id = draft.id;
    startTransition(async () => {
      const res = await deleteClip(id);
      if (res.error) return setMsg(res.error);
      setClips((all) => all.filter((c) => c.id !== id));
      setDraft(null);
    });
  }

  /* ---------- ligne de temps ---------- */
  const laneRef = useRef<HTMLDivElement>(null);
  const X = (t: number) => ((t - a) / span) * 100;
  const W = (s: number, e: number) => ((e - s) / span) * 100;
  const vis = (s: number, e: number) => e >= a && s <= b;
  const steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
  const st = steps.find((s) => span / s <= 8) ?? 3600;
  const ticks: number[] = [];
  for (let t = Math.ceil(a / st) * st; t <= b; t += st) ticks.push(t);

  function timeAt(clientX: number) {
    const r = laneRef.current!.getBoundingClientRect();
    return clamp(a + ((clientX - r.left) / r.width) * span, 0, dur || 0);
  }
  function scrub(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-clip]")) return;
    dragging.current = true;
    seek(timeAt(e.clientX));
    const mv = (ev: PointerEvent) => seek(timeAt(ev.clientX));
    const up = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  }

  const quarterSegs = useMemo(
    () =>
      quarters.map((q, i) => ({
        ...q,
        n: i + 1,
        end: i + 1 < quarters.length ? quarters[i + 1].t : dur,
      })),
    [quarters, dur],
  );
  const currentQ = [...quarterSegs].reverse().find((q) => time >= q.t)?.n ?? null;

  const allComments = clips.flatMap((c) => c.comments);
  const caption = allComments.find((c) => {
    const d = clamp(c.text.split(/\s+/).length * 0.42, 3, 10);
    return time >= c.t && time <= c.t + d;
  });

  const ioS = draft && !draft.id ? draft.start : inT;
  const ioE = draft && !draft.id ? draft.end : outT;
  const selId = draft?.id ?? null;
  const system = draft?.systemId ? systems.find((s) => s.id === draft.systemId) : null;
  const btn = "btn-secondary !px-3 !py-1.5 text-sm";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
      {/* Colonne gauche : lecteur, commandes, ligne de temps */}
      <div className="min-w-0 space-y-3">
        <div className="relative">
          <VideoStage key={source.id} source={source} controls={false} apiRef={api} />
          {source.kind === "file" && (
            <button
              type="button"
              aria-label="Lecture / pause"
              className="absolute inset-0 h-full w-full cursor-pointer"
              style={{ background: "transparent" }}
              onClick={togglePlay}
            />
          )}
          <div className="pointer-events-none absolute right-2 top-2 rounded bg-black/70 px-2 py-0.5 font-mono text-xs text-white">
            {currentQ ? `Q${currentQ} · ` : ""}
            {fmtT(time)}
          </div>
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
          <button className="btn-primary !px-3 !py-1.5" onClick={togglePlay} aria-label="Lecture / pause (espace)">
            {paused ? "▶" : "⏸"}
          </button>
          <button className={btn} onClick={() => seek(time - 5)} aria-label="Reculer de 5 s">−5 s</button>
          <button className={btn} onClick={() => seek(time + 5)} aria-label="Avancer de 5 s">+5 s</button>
          <span className="font-mono text-sm">
            {fmtT(time, true)} / {fmtT(dur)}
          </span>
          <button className={btn} onClick={cycleSpeed} aria-label="Vitesse de lecture">
            {String(SPEEDS[speedIdx]).replace(".", ",")}×
          </button>
          <button className={btn} onClick={toggleMute} aria-pressed={muted} aria-label="Son (M)">
            {muted ? "🔇" : "🔊"}
          </button>
          <span className="flex-1" />
          {canEdit && (
            <>
              <button className={btn} onClick={markIn} title="Début du clip (I)">⟦ Début <kbd className="ml-1.5 opacity-60">I</kbd></button>
              <button className={btn} onClick={markOut} title="Fin du clip (O)">Fin ⟧ <kbd className="ml-1.5 opacity-60">O</kbd></button>
              <button
                className="btn-primary !px-3 !py-1.5 text-sm"
                onClick={newClip}
                disabled={!(inT !== null && outT !== null && outT > inT)}
              >
                ✂ Créer le clip
              </button>
            </>
          )}
        </div>
        {msg && (
          <p className="text-xs" style={{ color: "var(--text-faint)" }} aria-live="polite">
            {msg}
          </p>
        )}

        <div className="card space-y-2 !p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {canEdit && (
                <button className={btn} onClick={markQuarter} title="Marquer le début d'un quart-temps (Q)">
                  + Quart-temps <kbd className="ml-1.5 opacity-60">Q</kbd>
                </button>
              )}
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                {clips.length} clip{clips.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button className={btn} onClick={() => { setZoom((z) => clamp(z - 1, 0, 3)); setV0(Math.max(0, time - 30)); }} aria-label="Dézoomer">−</button>
              <span className="min-w-16 text-center font-mono text-xs">{span >= dur - 0.5 ? "Tout" : fmtT(span)}</span>
              <button className={btn} onClick={() => { setZoom((z) => clamp(z + 1, 0, 3)); setV0(Math.max(0, time - 30)); }} aria-label="Zoomer">+</button>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="w-[72px] shrink-0 text-xs font-semibold sm:w-24" style={{ color: "var(--text-faint)" }}>
              <div className="h-[18px]" />
              <div className="mt-1.5 flex h-7 items-center">Quart-temps</div>
              <div className="mt-1.5 flex h-7 items-center">Clips</div>
            </div>
            <div ref={laneRef} className="relative min-w-0 flex-1 cursor-pointer touch-none select-none" onPointerDown={scrub}>
              <div className="relative h-[18px] font-mono text-[10px]" style={{ color: "var(--text-faint)" }}>
                {ticks.map((t) => (
                  <span key={t} className="absolute top-0 -translate-x-1/2 whitespace-nowrap" style={{ left: `${X(t)}%` }}>
                    {fmtT(t)}
                  </span>
                ))}
              </div>
              <div className="relative mt-1.5 h-7 rounded-md" style={{ background: "var(--surf-2)" }}>
                {quarterSegs.filter((q) => vis(q.t, q.end)).map((q) => {
                  const l = Math.max(a, q.t);
                  return (
                    <div
                      key={q.id}
                      className="absolute inset-y-0 flex items-center overflow-hidden rounded-r border-l-2 pl-1.5 text-sm font-bold"
                      style={{ left: `${X(l)}%`, width: `${W(l, Math.min(q.end, b))}%`, borderColor: "var(--text-faint)", background: "color-mix(in srgb, var(--text) 8%, transparent)" }}
                    >
                      Q{q.n}
                      {canEdit && (
                        <button
                          type="button"
                          className="ml-auto px-1 text-xs opacity-50 hover:opacity-100"
                          aria-label={`Retirer le repère Q${q.n}`}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => {
                            startTransition(async () => {
                              const res = await deleteQuarter(q.id);
                              if (res.error) setMsg(res.error);
                              else setQuarters((all) => all.filter((x) => x.id !== q.id));
                            });
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="relative mt-1.5 h-7 rounded-md" style={{ background: "var(--surf-2)" }}>
                {clips.filter((c) => vis(c.start, c.end)).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    data-clip={c.id}
                    title={`${c.title} · ${fmtT(c.start)}`}
                    aria-label={`Clip ${c.title}`}
                    onClick={() => selectClip(c)}
                    className="absolute inset-y-[3px] min-w-[3px] overflow-hidden whitespace-nowrap rounded px-1 text-left text-[10px] font-bold text-black"
                    style={{
                      left: `${X(c.start)}%`,
                      width: `${W(c.start, c.end)}%`,
                      background: phaseOf(c.phase).color,
                      opacity: c.id === selId ? 1 : 0.8,
                      outline: c.id === selId ? "2px solid #fff" : undefined,
                      outlineOffset: 1,
                      zIndex: c.id === selId ? 2 : 1,
                    }}
                  >
                    {c.title}
                  </button>
                ))}
                {ioS !== null && vis(ioS, ioE ?? ioS) && (
                  <div
                    className="pointer-events-none absolute inset-y-0 border-x-2 border-white"
                    style={{ left: `${X(ioS)}%`, width: `${ioE !== null ? W(ioS, ioE) : 0.3}%`, background: "rgba(255,255,255,.14)" }}
                  />
                )}
              </div>
              {time >= a && time <= b && (
                <div
                  className="pointer-events-none absolute -bottom-1 -top-1 z-10 w-0.5 bg-white"
                  style={{ left: `${X(time)}%` }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Colonne droite : panneau */}
      <div className="card min-w-0 space-y-4">
        <div className="seg w-full">
          {([["clip", "Clip"], ["list", `Liste (${clips.length})`]] as const).map(([k, l]) => (
            <button key={k} type="button" className={`flex-1 ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>

        {tab === "list" ? (
          <ul className="space-y-1.5">
            {clips.length === 0 && (
              <li className="text-sm" style={{ color: "var(--text-faint)" }}>Aucun clip pour cette vidéo.</li>
            )}
            {clips.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => selectClip(c)}
                  className="flex w-full items-center gap-2 rounded-lg border p-2 text-left"
                  style={{ borderColor: c.id === selId ? "var(--brand)" : "var(--border)" }}
                >
                  <span className="h-8 w-1 rounded" style={{ background: phaseOf(c.phase).color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.title}</span>
                    <span className="block text-xs" style={{ color: "var(--text-faint)" }}>
                      {fmtT(c.start)} → {fmtT(c.end)} · {phaseOf(c.phase).label}
                      {c.result ? ` · ${RESULTS.find((r) => r.id === c.result)?.label}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : draft ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">{draft.id ? "Clip" : "Nouveau clip"}</h2>
              <div className="flex gap-2">
                <button className={btn} onClick={() => playClip(draft)}>▶ Lire</button>
                {draft.id && canEdit && (
                  <button className={`${btn} !text-[#ff6b6b]`} onClick={removeClip} aria-label="Supprimer le clip">🗑</button>
                )}
                <button className={btn} onClick={() => setDraft(null)} aria-label="Fermer">×</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(["start", "end"] as const).map((f) => (
                <label key={f} className="label">
                  {f === "start" ? "Début" : `Fin · ${fmtT(Math.max(0, draft.end - draft.start), true)}`}
                  <span className="mt-1 flex gap-1.5">
                    <input
                      key={`${f}-${draft[f]}`}
                      className="input w-full font-mono"
                      defaultValue={fmtT(draft[f], true)}
                      disabled={!canEdit}
                      onBlur={(e) => {
                        const v = parseT(e.target.value);
                        if (v !== null && v !== draft[f]) patch({ [f]: v } as Partial<Draft>);
                      }}
                    />
                    {canEdit && (
                      <button type="button" className={btn} title="Prendre la position de lecture" onClick={() => patch({ [f]: api.current?.getTime() ?? 0 } as Partial<Draft>)}>
                        📍
                      </button>
                    )}
                  </span>
                </label>
              ))}
            </div>

            <label className="label">
              Titre
              <input
                className="input mt-1 w-full"
                value={draft.title}
                disabled={!canEdit}
                placeholder="Ex. Horns Flare : la sortie du 1"
                onChange={(e) => patch({ title: e.target.value }, false)}
              />
            </label>

            <div>
              <p className="label">Phase de jeu</p>
              <div className="flex flex-wrap gap-1.5">
                {PHASES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!canEdit}
                    className="chip"
                    onClick={() => patch({ phase: p.id })}
                    style={draft.phase === p.id ? { background: p.color, color: "#000", borderColor: p.color } : undefined}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="label">Résultat</p>
              <div className="flex flex-wrap gap-1.5">
                {resultsFor(draft.phase).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    disabled={!canEdit}
                    className="chip"
                    onClick={() => patch({ result: draft.result === r.id ? null : r.id })}
                    style={draft.result === r.id ? { background: "var(--brand)", color: "#fff", borderColor: "var(--brand)" } : undefined}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="label">Joueurs concernés</p>
              <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                {players.map((p) => {
                  const on = draft.playerIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!canEdit}
                      className="chip"
                      onClick={() => patch({ playerIds: on ? draft.playerIds.filter((x) => x !== p.id) : [...draft.playerIds, p.id] })}
                      style={on ? { background: "var(--brand)", color: "#fff", borderColor: "var(--brand)" } : undefined}
                    >
                      {p.first_name} {p.last_name}
                    </button>
                  );
                })}
                {players.length === 0 && (
                  <span className="text-xs" style={{ color: "var(--text-faint)" }}>Aucun joueur.</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="label">
                Système
                <select
                  className="input mt-1 w-full"
                  disabled={!canEdit}
                  value={draft.systemId ?? ""}
                  onChange={(e) => patch({ systemId: e.target.value || null, systemStep: 0 })}
                >
                  <option value="">— Aucun —</option>
                  {systems.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label className="label">
                Séquence
                <select
                  className="input mt-1 w-full"
                  disabled={!canEdit || !system}
                  value={draft.systemStep}
                  onChange={(e) => patch({ systemStep: Number(e.target.value) })}
                >
                  {system ? (
                    system.steps.map((s, i) => (
                      <option key={i} value={i}>{i + 1}. {s}</option>
                    ))
                  ) : (
                    <option>—</option>
                  )}
                </select>
              </label>
            </div>

            <div>
              <p className="label">Commentaires du coach</p>
              <ul className="space-y-1.5">
                {draft.comments.length === 0 && (
                  <li className="text-xs" style={{ color: "var(--text-faint)" }}>Aucun commentaire.</li>
                )}
                {draft.comments.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-lg p-2 text-sm" style={{ background: "var(--surf-2)" }}>
                    <span className="font-mono text-xs" style={{ color: "var(--text-faint)" }}>{fmtT(c.t)}</span>
                    <span className="min-w-0 flex-1">{c.text}</span>
                    {canEdit && (
                      <button type="button" aria-label="Supprimer le commentaire" className="text-xs" style={{ color: "#ff6b6b" }} onClick={() => patch({ comments: draft.comments.filter((_, k) => k !== i) })}>
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {canEdit && (
                <div className="mt-2 flex gap-2">
                  <input className="input min-w-0 flex-1" value={cmText} placeholder="Texte affiché en sous-titre…" maxLength={500} onChange={(e) => setCmText(e.target.value)} />
                  <button
                    type="button"
                    className={btn}
                    disabled={!cmText.trim()}
                    onClick={() => {
                      const t = clamp(api.current?.getTime() ?? draft.start, draft.start, draft.end);
                      patch({ comments: [...draft.comments, { t, text: cmText.trim() }].sort((x, y) => x.t - y.t) });
                      setCmText("");
                    }}
                  >
                    Ajouter
                  </button>
                </div>
              )}
            </div>

            <label className="label">
              Tags libres
              <input
                className="input mt-1 w-full"
                value={draft.tags}
                disabled={!canEdit}
                placeholder="ex. hedge, #5, box-out"
                onChange={(e) => patch({ tags: e.target.value }, false)}
              />
            </label>

            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                <b>Partager avec l&apos;équipe</b>
                <span className="block text-xs" style={{ color: "var(--text-faint)" }}>Visible par les joueurs sur leur page</span>
              </span>
              <input type="checkbox" className="h-5 w-5 accent-[var(--brand)]" checked={draft.shared} disabled={!canEdit} onChange={(e) => patch({ shared: e.target.checked })} />
            </label>

            {canEdit &&
              (draft.id ? (
                <p className="text-xs" style={{ color: "var(--text-faint)" }}>✓ Modifications enregistrées automatiquement.</p>
              ) : (
                <div className="flex justify-end gap-2">
                  <button className="btn-secondary" onClick={() => setDraft(null)}>Annuler</button>
                  <button className="btn-primary" onClick={createDraft}>✓ Créer le clip</button>
                </div>
              ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-faint)" }}>
              Marque le <b style={{ color: "var(--text)" }}>début (I)</b> et la <b style={{ color: "var(--text)" }}>fin (O)</b> d&apos;une
              action puis <b style={{ color: "var(--text)" }}>Créer le clip</b>, ou clique un bloc sur la ligne de temps.
            </p>
            {canEdit && (
              <>
                <h3 className="text-sm font-semibold">
                  Tag rapide <span className="font-normal" style={{ color: "var(--text-faint)" }}>· crée un clip des 10 dernières secondes</span>
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {PHASES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => quickTag(p.id)}
                      className="h-11 rounded-lg border text-[13px] font-semibold"
                      style={{ borderColor: "var(--border)", background: "var(--surf-2)" }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
              Raccourcis : Espace lecture · ← → ±5 s (Maj : 1 s) · , . image par image · I / O début / fin · Entrée créer · Q quart-temps · M son.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
