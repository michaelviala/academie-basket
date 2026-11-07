"use client";

import { useRef, useState, useTransition } from "react";
import { SystemCourt } from "@/components/system-court";
import {
  SYSTEM_CATEGORIES,
  interpolate,
  nextLabel,
  tokenKind,
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function SystemEditor({
  system,
  sequences,
  canEdit,
}: {
  system: { id: string; name: string; category: string; shared: boolean };
  sequences: SeqRow[];
  canEdit: boolean;
}) {
  const [seqs, setSeqs] = useState<SeqRow[]>(sequences);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [anim, setAnim] = useState<TokenPosition[] | null>(null);
  const [playing, setPlaying] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const runId = useRef(0);

  const cur = seqs[idx] ?? seqs[0];
  const shown = anim ?? cur?.positions ?? [];
  const previous = !playing && idx > 0 ? seqs[idx - 1].positions : null;
  const editing = canEdit && !playing;

  function report(res: { error?: string } | undefined) {
    if (res?.error) setMsg(res.error);
    else setMsg(null);
  }

  function patchCur(fn: (s: SeqRow) => SeqRow) {
    setSeqs((all) => all.map((s, i) => (i === idx ? fn(s) : s)));
  }

  /* ---------- lecture animée ---------- */
  async function play() {
    if (seqs.length === 0) return;
    const id = ++runId.current;
    setPlaying(true);
    setSelected(null);
    setIdx(0);
    setAnim(seqs[0].positions);
    await sleep(700);
    for (let i = 0; i < seqs.length - 1; i++) {
      if (runId.current !== id) return;
      const from = seqs[i].positions;
      const to = seqs[i + 1].positions;
      setIdx(i + 1);
      const duration = 1600;
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const step = (now: number) => {
          if (runId.current !== id) return resolve();
          const t = Math.min(1, (now - start) / duration);
          setAnim(interpolate(from, to, t));
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
      if (runId.current !== id) return;
      await sleep(900);
    }
    if (runId.current === id) stop();
  }

  function stop() {
    runId.current++;
    setPlaying(false);
    setAnim(null);
  }

  /* ---------- édition du terrain ---------- */
  function moveToken(label: string, x: number, y: number) {
    patchCur((s) => ({
      ...s,
      positions: s.positions.map((p) => (p.label === label ? { ...p, x, y } : p)),
    }));
  }

  function commitPositions() {
    if (!cur) return;
    startTransition(async () => {
      report(await updateSequencePositions(cur.id, cur.positions));
    });
  }

  function addToken(kind: "attack" | "defense" | "ball") {
    const label = kind === "ball" ? "B" : nextLabel(cur.positions, kind);
    if (!label || cur.positions.some((p) => p.label === label)) {
      setMsg(kind === "ball" ? "Le ballon est déjà sur le terrain." : "Nombre maximum atteint.");
      return;
    }
    const start =
      kind === "ball" ? { x: 50, y: 50 } : kind === "attack" ? { x: 50, y: 75 } : { x: 50, y: 30 };
    const next = seqs.map((s) => ({
      ...s,
      positions: [...s.positions, { label, ...start }],
    }));
    setSeqs(next);
    setSelected(label);
    startTransition(async () => {
      report(
        await setSystemTokens(
          system.id,
          next.map((s) => ({ id: s.id, positions: s.positions })),
        ),
      );
    });
  }

  function removeSelected() {
    if (!selected) return;
    const next = seqs.map((s) => ({
      ...s,
      positions: s.positions.filter((p) => p.label !== selected),
    }));
    setSeqs(next);
    setSelected(null);
    startTransition(async () => {
      report(
        await setSystemTokens(
          system.id,
          next.map((s) => ({ id: s.id, positions: s.positions })),
        ),
      );
    });
  }

  /* ---------- séquences ---------- */
  function newSequence() {
    startTransition(async () => {
      const res = await addSequence(system.id, cur.position, cur.positions);
      if (res.error || !res.sequence) return report({ error: res.error });
      const created: SeqRow = {
        id: res.sequence.id,
        label: res.sequence.label,
        notes: res.sequence.notes,
        position: res.sequence.position,
        positions: cur.positions,
      };
      setSeqs((all) => {
        const before = all.slice(0, idx + 1);
        const after = all.slice(idx + 1).map((s) => ({ ...s, position: s.position + 1 }));
        return [...before, created, ...after];
      });
      setIdx(idx + 1);
      setMsg(null);
    });
  }

  function removeSequence() {
    if (seqs.length <= 1) return;
    if (!confirm(`Supprimer la séquence « ${cur.label} » ?`)) return;
    const id = cur.id;
    startTransition(async () => {
      const res = await deleteSequence(id);
      if (res.error) return report(res);
      setSeqs((all) => all.filter((s) => s.id !== id));
      setIdx((i) => Math.max(0, i - 1));
    });
  }

  const kindOfSel = selected ? tokenKind(selected) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Terrain */}
        <div className="space-y-3">
          <div className="card !p-3">
            <SystemCourt
              positions={shown}
              previous={previous}
              editable={editing}
              selected={selected}
              onSelect={setSelected}
              onMove={moveToken}
              onCommit={commitPositions}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {playing ? (
                <button type="button" className="btn-primary" onClick={stop}>
                  ⏸ Arrêter
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={play}
                  disabled={seqs.length < 2}
                  title={seqs.length < 2 ? "Ajoute une 2ᵉ séquence pour animer" : ""}
                >
                  ▶ Lecture animée
                </button>
              )}
              <div className="flex flex-wrap gap-1.5">
                {seqs.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      stop();
                      setIdx(i);
                      setSelected(null);
                    }}
                    className="chip"
                    data-active={i === idx}
                    style={
                      i === idx
                        ? { background: "var(--brand)", color: "#fff", borderColor: "var(--brand)" }
                        : undefined
                    }
                  >
                    {i + 1}
                  </button>
                ))}
                {canEdit && (
                  <button type="button" className="chip" onClick={newSequence} disabled={pending || playing}>
                    + Séquence
                  </button>
                )}
              </div>
              {pending && (
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                  Enregistrement…
                </span>
              )}
            </div>
            {msg && (
              <p className="mt-2 text-xs" style={{ color: "#ff6b6b" }}>
                {msg}
              </p>
            )}
          </div>

          {canEdit && (
            <div className="card !p-3">
              <p className="label mb-2">Éléments du terrain</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secondary" onClick={() => addToken("attack")} disabled={playing}>
                  + Attaquant
                </button>
                <button type="button" className="btn-secondary" onClick={() => addToken("defense")} disabled={playing}>
                  + Défenseur
                </button>
                <button type="button" className="btn-secondary" onClick={() => addToken("ball")} disabled={playing}>
                  + Ballon
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={removeSelected}
                  disabled={!selected || playing}
                >
                  Retirer {selected ? (kindOfSel === "ball" ? "le ballon" : `« ${selected} »`) : "la sélection"}
                </button>
              </div>
              <p className="mt-2 text-xs" style={{ color: "var(--text-faint)" }}>
                Glisse les jetons sur le terrain. Les flèches montrent le déplacement depuis la séquence précédente.
              </p>
            </div>
          )}
        </div>

        {/* Panneau séquence + infos */}
        <div className="space-y-3">
          {cur && (
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <p className="label !mb-0">
                  Séquence {idx + 1} / {seqs.length}
                </p>
                {canEdit && seqs.length > 1 && (
                  <button type="button" className="text-xs" style={{ color: "#ff6b6b" }} onClick={removeSequence}>
                    Supprimer
                  </button>
                )}
              </div>
              {canEdit ? (
                <>
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
                  <textarea
                    key={`n-${cur.id}`}
                    className="input min-h-28"
                    placeholder="Consignes : qui bouge, quand, pourquoi…"
                    defaultValue={cur.notes ?? ""}
                    maxLength={2000}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v === (cur.notes ?? "")) return;
                      patchCur((s) => ({ ...s, notes: v || null }));
                      startTransition(async () => report(await updateSequenceNotes(cur.id, v)));
                    }}
                  />
                </>
              ) : (
                <>
                  <p className="font-semibold">{cur.label}</p>
                  <p className="whitespace-pre-wrap text-sm" style={{ color: "var(--text-dim, var(--text-faint))" }}>
                    {cur.notes || "Pas de consigne pour cette séquence."}
                  </p>
                </>
              )}
            </div>
          )}

          {canEdit && <MetaForm system={system} />}
        </div>
      </div>
    </div>
  );
}

function MetaForm({
  system,
}: {
  system: { id: string; name: string; category: string; shared: boolean };
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="card space-y-3"
      action={(fd) => {
        setSaved(false);
        setError(null);
        startTransition(async () => {
          const res = await updateSystemMeta(system.id, fd);
          if (res.error) setError(res.error);
          else setSaved(true);
        });
      }}
    >
      <p className="label !mb-0">Informations</p>
      <input className="input" name="name" defaultValue={system.name} required maxLength={120} />
      <select className="input" name="category" defaultValue={system.category}>
        {SYSTEM_CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="shared" defaultChecked={system.shared} />
        Partagé avec tous les coachs
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-primary" disabled={pending}>
          Enregistrer
        </button>
        {saved && <span className="text-xs" style={{ color: "var(--text-faint)" }}>Enregistré ✓</span>}
        {error && <span className="text-xs" style={{ color: "#ff6b6b" }}>{error}</span>}
      </div>
      <div className="flex gap-3 border-t pt-3" style={{ borderColor: "var(--border, rgba(255,255,255,.1))" }}>
        <button
          type="button"
          className="text-xs"
          style={{ color: "var(--brand)" }}
          onClick={() => startTransition(() => duplicateSystem(system.id))}
        >
          Dupliquer
        </button>
        <button
          type="button"
          className="text-xs"
          style={{ color: "#ff6b6b" }}
          onClick={() => {
            if (confirm(`Supprimer le système « ${system.name} » ?`))
              startTransition(() => deleteSystem(system.id));
          }}
        >
          Supprimer le système
        </button>
      </div>
    </form>
  );
}
