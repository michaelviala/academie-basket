"use client";

import { useState, useTransition } from "react";
import { VideoStage } from "@/components/video-stage";
import { formatTimecode } from "@/lib/library";
import {
  clipDuration,
  formatDuration,
  totalDuration,
  type ClipView,
} from "@/lib/videos";
import { deleteMontage, saveMontage } from "@/app/(app)/videos/actions";

export function MontageEditor({
  montage,
  clips,
  canEdit,
}: {
  montage: { id: string; title: string; description: string | null; clipIds: string[] };
  /** Tous les clips disponibles. */
  clips: ClipView[];
  canEdit: boolean;
}) {
  const byId = new Map(clips.map((c) => [c.id, c]));
  const [ids, setIds] = useState<string[]>(montage.clipIds.filter((i) => byId.has(i)));
  const [title, setTitle] = useState(montage.title);
  const [description, setDescription] = useState(montage.description ?? "");
  const [adding, setAdding] = useState("");
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();

  const list = ids.map((i) => byId.get(i)!).filter(Boolean);
  const current = list[index] ?? null;
  const total = totalDuration(list);

  function change(next: string[]) {
    setIds(next);
    setDirty(true);
    setStarted(false);
    setFinished(false);
    setIndex(0);
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    change(next);
  }
  function save() {
    startTransition(async () => {
      const res = await saveMontage(montage.id, { title, description, clipIds: ids });
      if (res.error) setMsg(res.error);
      else {
        setMsg("Montage enregistré ✓");
        setDirty(false);
      }
    });
  }
  function onClipEnded() {
    if (index < list.length - 1) setIndex(index + 1);
    else {
      setFinished(true);
      setStarted(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* Lecteur */}
      <div className="space-y-3">
        <div className="card !p-3">
          {current && started ? (
            <VideoStage
              key={`${index}-${current.id}`}
              source={current.source}
              start={current.start}
              end={current.end}
              autoplay
              onEnded={onClipEnded}
            />
          ) : (
            <button
              type="button"
              disabled={list.length === 0}
              onClick={() => {
                setIndex(finished ? 0 : index);
                setFinished(false);
                setStarted(true);
              }}
              className="relative block w-full overflow-hidden rounded-xl bg-black"
              style={{ aspectRatio: "16 / 9" }}
            >
              {current?.source.thumbUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.source.thumbUrl} alt="" className="h-full w-full object-cover opacity-60" />
              )}
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
                <span className="text-5xl">{finished ? "↻" : "▶"}</span>
                <span className="text-sm font-semibold">
                  {list.length === 0 ? "Ajoute des clips au montage" : finished ? "Revoir le montage" : "Lire le montage"}
                </span>
              </span>
            </button>
          )}
          {current && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {index + 1}/{list.length} · {current.title}
                </p>
                {current.note && (
                  <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                    {current.note}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button className="chip" disabled={index === 0} onClick={() => { setIndex(index - 1); setStarted(true); setFinished(false); }}>
                  ◀
                </button>
                <button className="chip" disabled={index >= list.length - 1} onClick={() => { setIndex(index + 1); setStarted(true); setFinished(false); }}>
                  ▶
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Liste ordonnée */}
      <div className="space-y-3">
        <div className="card space-y-3">
          {canEdit ? (
            <>
              <input className="input" value={title} maxLength={200} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} />
              <textarea className="input min-h-16" value={description} placeholder="Description (objectif du montage)" maxLength={1000} onChange={(e) => { setDescription(e.target.value); setDirty(true); }} />
            </>
          ) : (
            description && <p className="text-sm">{description}</p>
          )}
          <p className="text-xs" style={{ color: "var(--text-faint)" }}>
            {list.length} clip{list.length > 1 ? "s" : ""}
            {list.length > 0 && ` · ${total.complete ? "" : "≥ "}${formatDuration(total.seconds)}`}
          </p>

          <ol className="space-y-1.5">
            {list.map((c, i) => (
              <li
                key={`${c.id}-${i}`}
                className="flex items-center gap-2 rounded-lg border p-2"
                style={{
                  borderColor: i === index ? "var(--brand)" : "var(--border, rgba(255,255,255,.1))",
                }}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => { setIndex(i); setStarted(true); setFinished(false); }}
                >
                  <p className="truncate text-sm font-medium">
                    {i + 1}. {c.title}
                  </p>
                  <p className="truncate text-xs" style={{ color: "var(--text-faint)" }}>
                    {formatTimecode(c.start)}
                    {c.end !== null ? ` → ${formatTimecode(c.end)}` : ""}
                    {clipDuration(c) !== null ? ` · ${clipDuration(c)} s` : ""}
                  </p>
                </button>
                {canEdit && (
                  <div className="flex shrink-0 gap-1 text-sm">
                    <button className="chip" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter">↑</button>
                    <button className="chip" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Descendre">↓</button>
                    <button className="chip" onClick={() => change(ids.filter((_, k) => k !== i))} aria-label="Retirer">×</button>
                  </div>
                )}
              </li>
            ))}
          </ol>

          {canEdit && (
            <div className="flex gap-2">
              <select className="input min-w-0 flex-1" value={adding} onChange={(e) => setAdding(e.target.value)}>
                <option value="">Ajouter un clip…</option>
                {clips.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <button
                className="btn-secondary"
                disabled={!adding}
                onClick={() => {
                  change([...ids, adding]);
                  setAdding("");
                }}
              >
                Ajouter
              </button>
            </div>
          )}

          {canEdit && (
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn-primary" onClick={save} disabled={pending || !dirty}>
                {pending ? "Enregistrement…" : "Enregistrer"}
              </button>
              {msg && <span className="text-xs" style={{ color: "var(--text-faint)" }}>{msg}</span>}
              <button
                className="ml-auto text-xs"
                style={{ color: "#ff6b6b" }}
                onClick={() => {
                  if (confirm(`Supprimer le montage « ${montage.title} » ?`)) startTransition(() => void deleteMontage(montage.id));
                }}
              >
                Supprimer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
