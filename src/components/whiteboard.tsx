"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DictationField } from "@/components/dictation-field";
import { ArrowDefs, CourtLines, renderElement } from "@/components/whiteboard-scene";
import { deleteWhiteboard, saveWhiteboard } from "@/app/(app)/tableaux/actions";
import {
  COLORS,
  DIMS,
  THEMES,
  TOOL_LABELS,
  emptyPage,
  newId,
  rescalePages,
  type Court,
  type Pt,
  type Theme,
  type Tool,
  type WbEl,
  type WbPage,
} from "@/lib/whiteboard";

export type WbBoard = {
  id: string;
  title: string;
  description: string;
  court: Court;
  theme: Theme;
  teamId: string | null;
  shared: boolean;
  pages: WbPage[];
  authorName: string | null;
  logoUrl?: string | null;
};

const TOOL_GROUPS: { label: string; tools: Tool[] }[] = [
  { label: "Pièces", tools: ["select", "att", "def", "ball", "cone"] },
  { label: "Traits", tools: ["move", "pass", "dribble", "screen", "pen"] },
  { label: "Annoter", tools: ["zone", "text", "erase"] },
  { label: "Présenter", tools: ["laser"] },
];
const LINE_TOOLS: Tool[] = ["move", "pass", "dribble", "screen"];

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const r1 = (n: number) => Math.round(n * 10) / 10;

function moveEl(e: WbEl, dx: number, dy: number, w: number, h: number): WbEl {
  const cx = (n: number) => r1(clamp(n, 0, w));
  const cy = (n: number) => r1(clamp(n, 0, h));
  switch (e.k) {
    case "line": return { ...e, a: [cx(e.a[0] + dx), cy(e.a[1] + dy)], b: [cx(e.b[0] + dx), cy(e.b[1] + dy)] };
    case "pen": return { ...e, pts: e.pts.map((p): Pt => [cx(p[0] + dx), cy(p[1] + dy)]) };
    default: return { ...e, x: cx(e.x + dx), y: cy(e.y + dy) };
  }
}

export function Whiteboard({ board, teams, canEdit }: { board: WbBoard; teams: { id: string; name: string }[]; canEdit: boolean }) {
  const router = useRouter();
  const uid = useId().replace(/:/g, "") + "-";
  const svgRef = useRef<SVGSVGElement>(null);
  const [title, setTitle] = useState(board.title);
  const [description, setDescription] = useState(board.description);
  const [court, setCourt] = useState<Court>(board.court);
  const [theme, setTheme] = useState<Theme>(board.theme);
  const [teamId, setTeamId] = useState<string | null>(board.teamId);
  const [shared, setShared] = useState(board.shared);
  const [pages, setPages] = useState<WbPage[]>(board.pages);
  const [pi, setPi] = useState(0);
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState<string>(COLORS[0]);
  const [sel, setSel] = useState<string | null>(null);
  const [past, setPast] = useState<WbPage[][]>([]);
  const [draft, setDraft] = useState<WbEl | null>(null);
  const [textAt, setTextAt] = useState<Pt | null>(null);
  const [status, setStatus] = useState<"saved" | "dirty" | "saving" | "error">("saved");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [ver, setVer] = useState(0);
  const [full, setFull] = useState(false);
  // pointeur laser : éphémère, jamais enregistré
  const [laserView, setLaserView] = useState(false);
  const [laserHead, setLaserHead] = useState<Pt | null>(null);
  const [trail, setTrail] = useState<{ p: Pt; t: number }[]>([]);
  const laserActive = canEdit ? tool === "laser" : laserView;
  const trailLive = trail.length > 0;

  const drag = useRef<{ id: string; start: Pt; orig: WbEl } | null>(null);
  const zoneOrigin = useRef<Pt | null>(null);
  const textDone = useRef(false);
  const latest = useRef({ title, description, court, theme, teamId, shared, pages });
  useEffect(() => {
    latest.current = { title, description, court, theme, teamId, shared, pages };
  });

  const { w, h } = DIMS[court];
  const page = pages[Math.min(pi, pages.length - 1)];
  const dark = theme === "sombre";

  const touch = useCallback(() => {
    setVer((v) => v + 1);
    setStatus("dirty");
  }, []);

  /** Modifie la page courante en gardant l'état précédent pour « Annuler ». */
  const edit = useCallback(
    (fn: (els: WbEl[]) => WbEl[], track = true) => {
      if (track) setPast((p) => [...p.slice(-49), latest.current.pages]);
      setPages((cur) => cur.map((pg, i) => (i === Math.min(pi, cur.length - 1) ? { ...pg, els: fn(pg.els) } : pg)));
      touch();
    },
    [pi, touch],
  );

  const undo = useCallback(() => {
    if (!past.length) return;
    setPages(past[past.length - 1]);
    setPast(past.slice(0, -1));
    setSel(null);
    touch();
  }, [past, touch]);

  // enregistrement automatique 1,2 s après la dernière modification
  useEffect(() => {
    if (!canEdit || ver === 0) return;
    const t = setTimeout(async () => {
      setStatus("saving");
      const l = latest.current;
      const res = await saveWhiteboard({ id: board.id, ...l });
      if (res.error) {
        setErrMsg(res.error);
        setStatus("error");
      } else {
        setErrMsg(null);
        setStatus("saved");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [ver, canEdit, board.id]);

  useEffect(() => {
    if (status !== "dirty" && status !== "saving") return;
    const f = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [status]);

  // clavier : Suppr, Ctrl+Z, Échap
  useEffect(() => {
    if (!canEdit) return;
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if ((e.key === "Delete" || e.key === "Backspace") && sel) {
        e.preventDefault();
        edit((els) => els.filter((x) => x.id !== sel));
        setSel(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (e.key === "Escape") {
        setSel(null);
        setDraft(null);
        setTextAt(null);
        if (full) setFull(false);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [canEdit, sel, edit, full, undo]);

  useEffect(() => {
    if (!full) return;
    const last = pages.length - 1;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setFull(false); return; }
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.key.toLowerCase() === "l" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (canEdit) setTool((cur) => (cur === "laser" ? "select" : "laser"));
        else setLaserView((v) => !v);
        return;
      }
      // flèches (et PageHaut/PageBas) : page précédente / suivante
      if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); setPi((p) => Math.max(0, p - 1)); }
      else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); setPi((p) => Math.min(last, p + 1)); }
    };
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [full, pages.length, canEdit]);

  // la traînée du laser s'efface en 0,6 s
  useEffect(() => {
    if (!trailLive) return;
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      setTrail((cur) => {
        const n = cur.filter((q) => now - q.t < 600);
        return n.length === cur.length ? cur : n;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trailLive]);

  function toPt(e: React.PointerEvent): Pt {
    const svg = svgRef.current!;
    const m = svg.getScreenCTM();
    if (!m) return [0, 0];
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [r1(clamp(p.x, 0, w)), r1(clamp(p.y, 0, h))];
  }
  const hitId = (t: EventTarget) => (t as Element).closest?.("[data-id]")?.getAttribute("data-id") ?? null;

  function nextLabel(k: "att" | "def") {
    const used = new Set(page.els.filter((e) => e.k === k).map((e) => (e as { n: string }).n));
    for (let i = 1; i <= 9; i++) if (!used.has(String(i))) return String(i);
    return String(page.els.filter((e) => e.k === k).length + 1).slice(0, 2);
  }

  function laserMove(e: React.PointerEvent) {
    const p = toPt(e);
    setLaserHead(p);
    setTrail((cur) => [...cur.slice(-40), { p, t: performance.now() }]);
  }

  function onDown(e: React.PointerEvent<SVGSVGElement>) {
    if (laserActive) { laserMove(e); return; }
    if (!canEdit) return;
    const p = toPt(e);
    const hit = hitId(e.target);
    const drawing = LINE_TOOLS.includes(tool) || tool === "pen" || tool === "zone";
    if (tool === "erase") {
      if (hit) edit((els) => els.filter((x) => x.id !== hit));
      return;
    }
    if (hit && !drawing) {
      const el = page.els.find((x) => x.id === hit);
      if (!el) return;
      setSel(hit);
      setPast((pp) => [...pp.slice(-49), pages]);
      drag.current = { id: hit, start: p, orig: el };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    setSel(null);
    if (tool === "select") return;
    if (tool === "att" || tool === "def") {
      const el: WbEl = { id: newId(), k: tool, n: nextLabel(tool), x: p[0], y: p[1] };
      edit((els) => [...els, el]);
      setSel(el.id);
    } else if (tool === "ball" || tool === "cone") {
      const el: WbEl = tool === "ball" ? { id: newId(), k: "ball", x: p[0], y: p[1] } : { id: newId(), k: "cone", c: color, x: p[0], y: p[1] };
      edit((els) => [...els, el]);
      setSel(el.id);
    } else if (LINE_TOOLS.includes(tool)) {
      setDraft({ id: "draft", k: "line", s: tool as "move", c: color, a: p, b: p });
      e.currentTarget.setPointerCapture(e.pointerId);
    } else if (tool === "pen") {
      setDraft({ id: "draft", k: "pen", c: color, pts: [p] });
      e.currentTarget.setPointerCapture(e.pointerId);
    } else if (tool === "zone") {
      zoneOrigin.current = p;
      setDraft({ id: "draft", k: "zone", c: color, x: p[0], y: p[1], rx: 0, ry: 0 });
      e.currentTarget.setPointerCapture(e.pointerId);
    } else if (tool === "text") {
      textDone.current = false;
      setTextAt(p);
    }
  }

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (laserActive) { laserMove(e); return; }
    if (!canEdit) return;
    const p = toPt(e);
    const d = drag.current;
    if (d) {
      const moved = moveEl(d.orig, p[0] - d.start[0], p[1] - d.start[1], w, h);
      setPages((cur) => cur.map((pg, i) => (i === pi ? { ...pg, els: pg.els.map((x) => (x.id === d.id ? moved : x)) } : pg)));
      return;
    }
    if (!draft) return;
    if (draft.k === "line") setDraft({ ...draft, b: p });
    else if (draft.k === "pen") {
      const last = draft.pts[draft.pts.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.9) setDraft({ ...draft, pts: [...draft.pts, p] });
    } else if (draft.k === "zone" && zoneOrigin.current) {
      const o = zoneOrigin.current;
      setDraft({ ...draft, x: r1((o[0] + p[0]) / 2), y: r1((o[1] + p[1]) / 2), rx: r1(Math.abs(p[0] - o[0]) / 2), ry: r1(Math.abs(p[1] - o[1]) / 2) });
    }
  }

  function onUp() {
    if (drag.current) {
      drag.current = null;
      touch();
      return;
    }
    if (!draft) return;
    const d = draft;
    setDraft(null);
    zoneOrigin.current = null;
    if (d.k === "line" && Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]) > 3) edit((els) => [...els, { ...d, id: newId() }]);
    else if (d.k === "pen" && d.pts.length >= 2) edit((els) => [...els, { ...d, id: newId() }]);
    else if (d.k === "zone" && d.rx > 1.5 && d.ry > 1.5) edit((els) => [...els, { ...d, id: newId() }]);
  }

  function commitText(value: string) {
    if (textDone.current || !textAt) return;
    textDone.current = true;
    const txt = value.trim();
    if (txt) edit((els) => [...els, { id: newId(), k: "text", c: color, x: textAt[0], y: textAt[1], txt: txt.slice(0, 80) }]);
    setTextAt(null);
  }

  const selected = sel ? page.els.find((x) => x.id === sel) ?? null : null;
  function chooseColor(c: string) {
    setColor(c);
    if (selected && "c" in selected) edit((els) => els.map((x) => (x.id === sel ? ({ ...x, c } as WbEl) : x)));
  }
  function setLabel(n: string) {
    edit((els) => els.map((x) => (x.id === sel && (x.k === "att" || x.k === "def") ? { ...x, n } : x)));
  }

  function addPage(copy = false) {
    setPast((p) => [...p.slice(-49), pages]);
    const np: WbPage = copy
      ? { ...page, id: newId(), title: `${page.title} (copie)`.slice(0, 80), els: page.els.map((e) => ({ ...e, id: newId() })) }
      : emptyPage(pages.length + 1);
    setPages((cur) => [...cur.slice(0, pi + 1), np, ...cur.slice(pi + 1)]);
    setPi(pi + 1);
    setSel(null);
    touch();
  }
  function removePage() {
    if (pages.length < 2 || !confirm(`Supprimer « ${page.title} » ?`)) return;
    setPast((p) => [...p.slice(-49), pages]);
    setPages((cur) => cur.filter((_, i) => i !== pi));
    setPi(Math.max(0, pi - 1));
    setSel(null);
    touch();
  }
  function patchPage(patch: Partial<WbPage>) {
    setPages((cur) => cur.map((pg, i) => (i === pi ? { ...pg, ...patch } : pg)));
    touch();
  }
  function changeCourt(c: Court) {
    if (c === court) return;
    setPast((p) => [...p.slice(-49), pages]);
    setPages(rescalePages(pages, court, c));
    setCourt(c);
    setSel(null);
    touch();
  }
  async function remove() {
    if (!confirm("Supprimer définitivement ce tableau ?")) return;
    const r = await deleteWhiteboard(board.id);
    if (r.error) return alert(r.error);
    router.push("/tableaux");
  }

  const btn = "rounded-lg border px-2 py-1.5 text-xs";
  const stage = (
    <div className="relative" style={{ background: THEMES[theme].out, borderRadius: 12, overflow: "hidden", ...(full ? { flex: 1, minHeight: 0 } : {}) }}>
      <svg
        ref={svgRef}
        viewBox={`-6 -6 ${w + 12} ${h + 12}`}
        role="img"
        aria-label={`Tableau « ${title} », ${page.title} : ${page.els.length} éléments sur un ${court === "half" ? "demi-terrain" : "terrain complet"}`}
        style={{ display: "block", width: "100%", height: full ? "100%" : "auto", maxHeight: full ? undefined : "78vh", touchAction: canEdit || laserActive ? "none" : "auto", cursor: laserActive ? "none" : canEdit ? (tool === "select" ? "default" : "crosshair") : "default" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={() => setLaserHead(null)}
      >
        <rect x={-6} y={-6} width={w + 12} height={h + 12} fill={THEMES[theme].out} />
        <ArrowDefs uid={uid} />
        <CourtLines court={court} theme={theme} logoUrl={board.logoUrl} uid={uid} />
        {page.els.map((e) => renderElement(e, theme, uid, e.id === sel))}
        {draft && renderElement(draft, theme, uid)}
        {laserActive && (
          <g pointerEvents="none">
            <defs>
              <filter id={`${uid}laser`} x="-200%" y="-200%" width="500%" height="500%">
                <feGaussianBlur stdDeviation="1.6" />
              </filter>
            </defs>
            {trail.slice(1).map((q, i) => {
              const prev = trail[i];
              const a = (i + 1) / trail.length; // plus ancien = plus transparent
              return <line key={i} x1={prev.p[0]} y1={prev.p[1]} x2={q.p[0]} y2={q.p[1]} stroke="#ff2a2a" strokeWidth={0.5 + 1.6 * a} strokeLinecap="round" opacity={0.75 * a} />;
            })}
            {laserHead && (
              <>
                <circle cx={laserHead[0]} cy={laserHead[1]} r={4.2} fill="#ff1f1f" opacity={0.55} filter={`url(#${uid}laser)`} />
                <circle cx={laserHead[0]} cy={laserHead[1]} r={1.5} fill="#ff3b3b" />
                <circle cx={laserHead[0]} cy={laserHead[1]} r={0.6} fill="#fff" />
              </>
            )}
          </g>
        )}
      </svg>
      {textAt && (
        <input
          ref={(el) => {
            // focus différé : le clic qui a ouvert le champ ne doit pas le fermer aussitôt
            if (el) setTimeout(() => el.focus(), 60);
          }}
          maxLength={80}
          placeholder="Texte…"
          aria-label="Texte à écrire sur le terrain"
          className="input absolute !w-40 !py-1 text-sm"
          style={{ left: `${((textAt[0] + 6) / (w + 12)) * 100}%`, top: `${((textAt[1] + 6) / (h + 12)) * 100}%`, transform: "translate(-8px,-50%)" }}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitText(e.currentTarget.value);
            if (e.key === "Escape") {
              textDone.current = true;
              setTextAt(null);
            }
          }}
          onBlur={(e) => commitText(e.currentTarget.value)}
        />
      )}
    </div>
  );

  const toolsPanel = (cls: string) => (
          <div className={cls}>
            {TOOL_GROUPS.map((g) => (
              <div key={g.label}>
                <p className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>{g.label}</p>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-2">
                  {g.tools.map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={tool === t}
                      onClick={() => setTool(t)}
                      className="min-h-10 rounded-lg border px-1.5 text-xs font-medium"
                      style={tool === t ? { background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" } : { borderColor: "var(--border)", background: "var(--surf-2)" }}
                    >
                      {TOOL_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Couleur (traits, texte, plots)</p>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Couleur ${c}`}
                    aria-pressed={color === c}
                    onClick={() => chooseColor(c)}
                    className="h-8 w-8 rounded-full"
                    style={{ background: c, border: color === c ? "3px solid var(--brand)" : "2px solid var(--border)" }}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn} style={{ borderColor: "var(--border)" }} onClick={undo} disabled={!past.length}>↶ Annuler</button>
              {selected && (
                <button type="button" className={btn} style={{ borderColor: "var(--border)" }} onClick={() => { edit((els) => els.filter((x) => x.id !== sel)); setSel(null); }}>Supprimer</button>
              )}
            </div>
            {selected && (selected.k === "att" || selected.k === "def") && (
              <label className="text-xs" style={{ color: "var(--text-faint)" }}>
                Numéro
                <select className="input mt-1 w-full" value={selected.n} onChange={(e) => setLabel(e.target.value)}>
                  {Array.from({ length: 15 }, (_, i) => String(i + 1)).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            )}
          </div>
  );

  const pageTabs = (
    <div className="flex flex-wrap items-center gap-2">
      {pages.map((pg, i) => (
        <button
          key={pg.id}
          type="button"
          onClick={() => { setPi(i); setSel(null); }}
          aria-current={i === pi}
          className={btn}
          style={i === pi ? { borderColor: "var(--brand)", color: "var(--brand)", fontWeight: 600 } : { borderColor: "var(--border)" }}
        >
          {pg.title || `Page ${i + 1}`}
        </button>
      ))}
      {canEdit && (
        <>
          <button type="button" className={btn} style={{ borderColor: "var(--border)", borderStyle: "dashed" }} onClick={() => addPage(false)}>+ Page</button>
          <button type="button" className={btn} style={{ borderColor: "var(--border)" }} onClick={() => addPage(true)}>Dupliquer</button>
          {pages.length > 1 && <button type="button" className={btn} style={{ borderColor: "var(--border)" }} onClick={removePage}>Supprimer la page</button>}
        </>
      )}
    </div>
  );

  if (full)
    return (
      <div className="fixed inset-0 z-[100] flex flex-col gap-2 p-3" style={{ background: dark ? "#0f1015" : "#111" }}>
        <div className="flex items-center gap-2 text-white">
          <b className="display text-xl">{title}</b>
          <span className="text-sm opacity-80">{page.title}{pages.length > 1 ? ` · ${Math.min(pi, pages.length - 1) + 1}/${pages.length}` : ""}</span>
          <div className="flex-1" />
          {!canEdit && (
            <button type="button" className="btn-secondary" aria-pressed={laserView} onClick={() => setLaserView((v) => !v)} title="Pointeur laser (L)" style={laserView ? { background: "#e11d1d", borderColor: "#e11d1d", color: "#fff" } : undefined}>
              🔴 Laser
            </button>
          )}
          {pages.length > 1 && (
            <>
              <button type="button" className="btn-secondary" disabled={pi === 0} onClick={() => setPi(pi - 1)} aria-label="Page précédente" title="Page précédente (←)">←</button>
              <button type="button" className="btn-secondary" disabled={pi >= pages.length - 1} onClick={() => setPi(pi + 1)} aria-label="Page suivante" title="Page suivante (→)">→</button>
            </>
          )}
          {canEdit && (
            <span className="text-xs opacity-80" aria-live="polite">
              {status === "saved" ? "✓ Enregistré" : status === "error" ? "Erreur d'enregistrement" : "Enregistrement…"}
            </span>
          )}
          <button type="button" className="btn-secondary" onClick={() => setFull(false)}>✕ Quitter</button>
        </div>
        <div className="flex min-h-0 flex-1 gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {stage}
            {page.note && <p className="rounded-lg bg-black/60 p-3 text-center text-base text-white">{page.note}</p>}
          </div>
          {canEdit && toolsPanel("flex w-[176px] flex-none flex-col gap-3 overflow-y-auto rounded-xl border p-3")}
        </div>
      </div>
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/tableaux" className="text-xs" style={{ color: "var(--text-faint)" }}>← Tous les tableaux</Link>
        <div className="flex-1" />
        {canEdit && (
          <span className="text-xs" style={{ color: status === "error" ? "#f87171" : "var(--text-faint)" }} aria-live="polite">
            {status === "saved" ? "✓ Enregistré" : status === "error" ? `Erreur : ${errMsg}` : "Enregistrement…"}
          </span>
        )}
        {!canEdit && (
          <button type="button" className="btn-secondary" aria-pressed={laserView} onClick={() => setLaserView((v) => !v)} style={laserView ? { background: "#e11d1d", borderColor: "#e11d1d", color: "#fff" } : undefined}>
            🔴 Laser
          </button>
        )}
        <button type="button" className="btn-secondary" onClick={() => setFull(true)}>⛶ Plein écran</button>
      </div>

      {canEdit ? (
        <input className="input display w-full !text-2xl font-bold" value={title} maxLength={200} aria-label="Titre du tableau" onChange={(e) => { setTitle(e.target.value); touch(); }} />
      ) : (
        <h1 className="display text-2xl font-bold sm:text-3xl">{title}</h1>
      )}
      {!canEdit && description && <p className="text-sm" style={{ color: "var(--text-faint)" }}>{description}</p>}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        {canEdit && toolsPanel("card flex flex-none flex-col gap-3 !p-3 lg:w-[176px]")}

        <div className="min-w-0 flex-1 space-y-3">
          {stage}
          {pageTabs}
          {canEdit ? (
            <div className="space-y-2">
              <input className="input w-full" value={page.title} maxLength={80} aria-label="Titre de la page" placeholder="Titre de la page" onChange={(e) => patchPage({ title: e.target.value })} />
              <DictationField
                rows={3}
                placeholder="Explication pour les joueurs : consigne, points d'attention… (ou dicte-la avec le micro)"
                value={page.note}
                onValueChange={(v) => patchPage({ note: v })}
                maxLength={2000}
              />
            </div>
          ) : (
            page.note && <p className="card whitespace-pre-line text-sm leading-relaxed">{page.note}</p>
          )}
        </div>

        {canEdit && (
          <div className="card flex flex-none flex-col gap-3 !p-3 lg:w-[260px]">
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Terrain</p>
              <div className="seg">
                <button type="button" className={court === "half" ? "active" : ""} onClick={() => changeCourt("half")}>Demi</button>
                <button type="button" className={court === "full" ? "active" : ""} onClick={() => changeCourt("full")}>Complet</button>
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Fond</p>
              <div className="seg">
                {(Object.keys(THEMES) as Theme[]).map((t) => (
                  <button key={t} type="button" className={theme === t ? "active" : ""} onClick={() => { setTheme(t); touch(); }}>{THEMES[t].label}</button>
                ))}
              </div>
            </div>
            <label className="text-xs" style={{ color: "var(--text-faint)" }}>
              Description (facultatif)
              <textarea className="input mt-1 w-full" rows={2} maxLength={2000} value={description} onChange={(e) => { setDescription(e.target.value); touch(); }} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={shared} onChange={(e) => { setShared(e.target.checked); touch(); }} />
              Visible par les joueurs
            </label>
            <label className="text-xs" style={{ color: "var(--text-faint)" }}>
              Équipe concernée
              <select className="input mt-1 w-full" value={teamId ?? ""} onChange={(e) => { setTeamId(e.target.value || null); touch(); }}>
                <option value="">Tout le club</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
              {shared ? "Les joueurs de l'équipe choisie (ou de tout le club) voient ce tableau en lecture seule." : "Brouillon : seuls les coachs le voient."}
            </p>
            <button type="button" className="btn-secondary" style={{ color: "#f87171" }} onClick={remove}>Supprimer le tableau</button>
            {board.authorName && <p className="text-xs" style={{ color: "var(--text-faint)" }}>Créé par {board.authorName}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
