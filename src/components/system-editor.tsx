"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { SystemCourt } from "@/components/system-court";
import {
  SYSTEM_CATEGORIES,
  ballBetween,
  categoryLabel,
  holder,
  holderBall,
  interpolate,
  nextLabel,
  type TokenPosition,
} from "@/lib/systems";
import {
  addSequence,
  deleteSequence,
  deleteSystem,
  duplicateSystem,
  setSystemTokens,
  updateSequenceLabel,
  updateSequenceNotes,
  updateSequencePositions,
  updateSystemMeta,
} from "@/app/(app)/systemes/actions";

export type SeqRow = {
  id: string;
  label: string;
  notes: string | null;
  position: number;
  positions: TokenPosition[];
};

type Tool = "move" | "ball" | "screen";
const SEGMENT_SECONDS = 1.7;

function Icon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function SystemEditor({
  system,
  sequences,
  canEdit,
  linkedClips,
}: {
  system: { id: string; name: string; category: string; shared: boolean };
  sequences: SeqRow[];
  canEdit: boolean;
  linkedClips: { id: string; title: string }[];
}) {
  const [meta, setMeta] = useState(system);
  const [renaming, setRenaming] = useState(false);
  const [seqs, setSeqs] = useState<SeqRow[]>(sequences);
  const [p, setP] = useState(0); // progression : 0 … n-1
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [curve, setCurve] = useState(true);
  const [tool, setTool] = useState<Tool>("move");
  const [selected, setSelected] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const pRef = useRef(0);

  const n = seqs.length;
  const last = Math.max(0, n - 1);
  const idx = Math.min(last, Math.round(p));
  const atRest = !playing && Math.abs(p - idx) < 0.001;
  const cur = seqs[idx];
  const editing = canEdit && atRest;

  function go(v: number) {
    pRef.current = v;
    setP(v);
  }

  /* ---------- lecture ---------- */
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let prev: number | null = null;
    const step = (now: number) => {
      const dt = prev === null ? 0 : (now - prev) / 1000;
      prev = now;
      const next = pRef.current + (dt * speed) / SEGMENT_SECONDS;
      if (next >= last) {
        pRef.current = last;
        setP(last);
        setPlaying(false);
        return;
      }
      pRef.current = next;
      setP(next);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, last]);

  function togglePlay() {
    if (n < 2) return;
    if (playing) return setPlaying(false);
    if (pRef.current >= last - 0.001) go(0);
    setSelected(null);
    setPlaying(true);
  }

  /* ---------- affichage ---------- */
  const i0 = Math.min(last - (n > 1 ? 1 : 0), Math.floor(p));
  const f = p - i0;
  const moving = !atRest && n > 1;
  const shown = moving ? interpolate(seqs[i0].positions, seqs[i0 + 1].positions, f, curve) : (cur?.positions ?? []);
  const ball = moving
    ? ballBetween(seqs[i0].positions, seqs[i0 + 1].positions, f, curve)
    : holderBall(cur?.positions ?? []);
  const previous = atRest && idx > 0 ? seqs[idx - 1].positions : null;
  const segment = moving ? { from: seqs[i0].positions, to: seqs[i0 + 1].positions } : null;
  const prevHolder = segment ? holder(segment.from) : previous ? holder(previous) : null;
  const curHolder = segment ? holder(segment.to) : cur ? holder(cur.positions) : null;
  const pass =
    prevHolder && curHolder && prevHolder.label !== curHolder.label
      ? { from: { x: prevHolder.x, y: prevHolder.y }, to: { x: curHolder.x, y: curHolder.y } }
      : null;

  function report(res: { error?: string } | undefined) {
    setMsg(res?.error ?? null);
  }
  function patchCur(fn: (s: SeqRow) => SeqRow) {
    setSeqs((all) => all.map((s, i) => (i === idx ? fn(s) : s)));
  }
  function savePositions(positions: TokenPosition[]) {
    startTransition(async () => report(await updateSequencePositions(cur.id, positions)));
  }

  /* ---------- édition du terrain ---------- */
  function moveToken(label: string, x: number, y: number) {
    patchCur((s) => ({ ...s, positions: s.positions.map((q) => (q.label === label ? { ...q, x, y } : q)) }));
  }

  function tap(label: string) {
    if (!editing) return;
    const positions = cur.positions.map((q) => {
      if (tool === "ball") {
        const { ball: _b, ...rest } = q;
        void _b;
        return q.label === label && !q.ball ? { ...rest, ball: true } : rest;
      }
      const { screen: _s, ...rest } = q;
      void _s;
      return q.label === label ? (q.screen ? rest : { ...rest, screen: true }) : q;
    });
    patchCur((s) => ({ ...s, positions }));
    savePositions(positions);
  }

  function pushAll(next: SeqRow[]) {
    setSeqs(next);
    startTransition(async () =>
      report(await setSystemTokens(system.id, next.map((s) => ({ id: s.id, positions: s.positions })))),
    );
  }

  function addToken(kind: "attack" | "defense") {
    const label = nextLabel(cur.positions, kind);
    if (!label) return setMsg("Nombre maximum atteint.");
    const start = kind === "attack" ? { x: 50, y: 75 } : { x: 50, y: 30 };
    pushAll(seqs.map((s) => ({ ...s, positions: [...s.positions, { label, ...start }] })));
    setSelected(label);
  }

  function removeSelected() {
    if (!selected) return;
    pushAll(seqs.map((s) => ({ ...s, positions: s.positions.filter((q) => q.label !== selected) })));
    setSelected(null);
  }

  /* ---------- séquences ---------- */
  function newSequence() {
    // Le nouvel écran repart de zéro ; le ballon et les positions sont conservés.
    const positions = cur.positions.map((q) => {
      const { screen: _s, ...rest } = q;
      void _s;
      return rest;
    });
    startTransition(async () => {
      const res = await addSequence(system.id, cur.position, positions);
      if (res.error || !res.sequence) return report({ error: res.error });
      const created: SeqRow = {
        id: res.sequence.id,
        label: res.sequence.label,
        notes: res.sequence.notes,
        position: res.sequence.position,
        positions,
      };
      setSeqs((all) => [
        ...all.slice(0, idx + 1),
        created,
        ...all.slice(idx + 1).map((s) => ({ ...s, position: s.position + 1 })),
      ]);
      go(idx + 1);
      setMsg(null);
    });
  }

  function removeSequence() {
    if (n <= 1 || !confirm(`Supprimer la séquence « ${cur.label} » ?`)) return;
    const id = cur.id;
    startTransition(async () => {
      const res = await deleteSequence(id);
      if (res.error) return report(res);
      setSeqs((all) => all.filter((s) => s.id !== id));
      go(Math.max(0, idx - 1));
    });
  }

  /* ---------- méta ---------- */
  function saveMeta(next: typeof meta) {
    setMeta(next);
    const fd = new FormData();
    fd.set("name", next.name);
    fd.set("category", next.category);
    if (next.shared) fd.set("shared", "on");
    startTransition(async () => report(await updateSystemMeta(system.id, fd)));
  }

  const btn = "btn-secondary inline-flex items-center gap-2";

  return (
    <div className="min-w-0 space-y-4">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--brand)" }}>
            Systèmes de jeu · {categoryLabel(meta.category)}
          </p>
          {renaming ? (
            <form
              className="mt-1 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const name = String(fd.get("name") ?? "").trim();
                if (name) saveMeta({ ...meta, name, category: String(fd.get("category")) });
                setRenaming(false);
              }}
            >
              <input className="input" name="name" defaultValue={meta.name} maxLength={120} autoFocus required />
              <select className="input" name="category" defaultValue={meta.category} style={{ width: "auto" }}>
                {SYSTEM_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <button className="btn-primary">OK</button>
            </form>
          ) : (
            <h1 className="display mt-1 text-3xl font-bold uppercase">{meta.name}</h1>
          )}
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button className={btn} onClick={() => setRenaming((v) => !v)}>
              <Icon d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /> Renommer
            </button>
            <button className={btn} onClick={() => startTransition(() => duplicateSystem(system.id))}>
              <Icon d="M9 9h11v11H9zM5 15V4h11" /> Dupliquer
            </button>
            <button
              className={btn}
              onClick={() => saveMeta({ ...meta, shared: !meta.shared })}
              style={meta.shared ? { borderColor: "var(--brand)", color: "var(--brand)" } : undefined}
            >
              <Icon d="M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
              {meta.shared ? "Partagé à l'équipe" : "Non partagé"}
            </button>
            <button
              className={btn}
              style={{ color: "#ff6b6b" }}
              aria-label="Supprimer le système"
              onClick={() => {
                if (confirm(`Supprimer le système « ${meta.name} » ?`)) startTransition(() => deleteSystem(system.id));
              }}
            >
              <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Centre : terrain + transport */}
        <div className="card min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {canEdit ? (
              <div className="seg">
                {([["move", "Déplacer"], ["ball", "Ballon"], ["screen", "Écran"]] as [Tool, string][]).map(([k, label]) => (
                  <button key={k} type="button" className={tool === k ? "active" : ""} onClick={() => { setTool(k); setSelected(null); }}>
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <span />
            )}
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>
              {canEdit ? (tool === "move" ? "Glisse les joueurs" : tool === "ball" ? "Touche le porteur du ballon" : "Touche le joueur qui pose l'écran") : ""}
            </span>
          </div>

          <div className="mx-auto w-full max-w-[560px]">
            <SystemCourt
              positions={shown}
              ball={ball}
              previous={previous}
              segment={segment}
              pass={pass}
              curve={curve}
              mode={editing ? (tool === "move" ? "move" : "tap") : "none"}
              selected={selected}
              onSelect={setSelected}
              onMove={moveToken}
              onCommit={() => savePositions(cur.positions)}
              onTap={tap}
            />
          </div>

          {/* Séquences */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {seqs.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setPlaying(false); go(i); setSelected(null); }}
                className="min-w-[104px] shrink-0 rounded-lg border px-3 py-2 text-left"
                style={{
                  borderColor: i === idx && atRest ? "var(--brand)" : "var(--border)",
                  background: i === idx && atRest ? "color-mix(in srgb, var(--brand) 14%, transparent)" : "var(--surf-2)",
                }}
              >
                <span className="display block text-lg font-bold leading-none" style={{ color: "var(--brand)" }}>{i + 1}</span>
                <span className="block truncate text-xs">{s.label}</span>
              </button>
            ))}
          </div>

          {/* Transport */}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-secondary" aria-label="Séquence précédente" disabled={idx === 0 && atRest} onClick={() => { setPlaying(false); go(Math.max(0, atRest ? idx - 1 : idx)); }}>⏮</button>
            <button type="button" className="btn-primary" aria-label={playing ? "Pause" : "Lecture"} disabled={n < 2} onClick={togglePlay}>
              {playing ? "⏸" : "▶"}
            </button>
            <button type="button" className="btn-secondary" aria-label="Séquence suivante" disabled={idx >= last} onClick={() => { setPlaying(false); go(Math.min(last, idx + 1)); }}>⏭</button>
            <input
              type="range"
              className="min-w-[120px] flex-1 accent-[var(--brand)]"
              min={0}
              max={Math.max(1, last * 1000)}
              value={Math.round(p * 1000)}
              disabled={n < 2}
              aria-label="Progression"
              onChange={(e) => { setPlaying(false); go(Number(e.target.value) / 1000); }}
            />
            <div className="seg">
              {[0.5, 1, 2].map((v) => (
                <button key={v} type="button" className={speed === v ? "active" : ""} onClick={() => setSpeed(v)}>
                  {v}×
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: "var(--text-faint)" }}>
            <span className="font-mono">
              {moving
                ? `Séquence ${i0 + 1} → ${i0 + 2}`
                : `Séquence ${idx + 1}/${n} · ${cur?.label}`}
            </span>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
              Trajectoires fluidifiées
              <input type="checkbox" className="accent-[var(--brand)]" checked={curve} onChange={(e) => setCurve(e.target.checked)} />
            </label>
          </div>
          {(msg || pending) && (
            <p className="text-xs" style={{ color: msg ? "#ff6b6b" : "var(--text-faint)" }}>
              {msg ?? "Enregistrement…"}
            </p>
          )}
        </div>

        {/* Droite */}
        <div className="min-w-0 space-y-4">
          <div className="card space-y-3">
            <h2 className="font-semibold">Séquence en cours</h2>
            {canEdit ? (
              <input
                key={`l-${cur.id}`}
                className="input"
                defaultValue={cur.label}
                maxLength={80}
                onBlur={(e) => {
                  const v = e.target.value.trim() || cur.label;
                  if (v === cur.label) return;
                  patchCur((s) => ({ ...s, label: v }));
                  startTransition(async () => report(await updateSequenceLabel(cur.id, v)));
                }}
              />
            ) : (
              <p className="font-medium">{cur.label}</p>
            )}
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <button className="btn-primary" onClick={newSequence} disabled={pending || !atRest}>＋ Ajouter une séquence</button>
                {n > 1 && (
                  <button className="btn-secondary" style={{ color: "#ff6b6b" }} onClick={removeSequence} disabled={!atRest}>Supprimer</button>
                )}
              </div>
            )}
            {canEdit && (
              <>
                <div className="flex flex-wrap gap-2">
                  <button className="chip" onClick={() => addToken("attack")} disabled={!atRest}>+ Attaquant</button>
                  <button className="chip" onClick={() => addToken("defense")} disabled={!atRest}>+ Défenseur</button>
                  <button className="chip" onClick={removeSelected} disabled={!selected || !atRest}>Retirer {selected ? `« ${selected} »` : ""}</button>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-faint)" }}>
                  Déplace les joueurs pour cette séquence. L&apos;outil <b>Ballon</b> désigne le porteur (une passe est dessinée), <b>Écran</b> marque un écran. L&apos;animation interpole les déplacements entre séquences.
                </p>
              </>
            )}
          </div>

          <div className="card space-y-2">
            <h2 className="font-semibold">Consignes</h2>
            {canEdit ? (
              <textarea
                key={`n-${cur.id}`}
                className="input min-h-32"
                placeholder="Qui bouge, quand, pourquoi…"
                defaultValue={cur.notes ?? ""}
                maxLength={2000}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v === (cur.notes ?? "")) return;
                  patchCur((s) => ({ ...s, notes: v || null }));
                  startTransition(async () => report(await updateSequenceNotes(cur.id, v)));
                }}
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm">{cur.notes || "Pas de consigne pour cette séquence."}</p>
            )}
          </div>

          <div className="card space-y-2">
            <h2 className="font-semibold">Clips liés · {linkedClips.length}</h2>
            {linkedClips.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                Associe un clip à ce système depuis l&apos;éditeur vidéo pour comparer le jeu réel au schéma.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {linkedClips.map((c) => (
                  <li key={c.id}>
                    <Link href="/videos" className="underline" style={{ color: "var(--brand)" }}>▶ {c.title}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
