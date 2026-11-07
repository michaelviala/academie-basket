"use client";

import { useRef, useState, useTransition } from "react";
import { VideoStage, type StageApi } from "@/components/video-stage";
import { formatTimecode, parseTimecode } from "@/lib/library";
import type { ClipView, VideoSourceInfo } from "@/lib/videos";
import { createClip, updateClip } from "@/app/(app)/videos/actions";

export function ClipModal({
  sources,
  players,
  initial,
  onClose,
}: {
  sources: VideoSourceInfo[];
  players: { id: string; first_name: string; last_name: string }[];
  initial?: ClipView;
  onClose: () => void;
}) {
  const [sourceId, setSourceId] = useState(initial?.source.id ?? sources[0]?.id ?? "");
  const [start, setStart] = useState(formatTimecode(initial?.start ?? 0) || "0:00");
  const [end, setEnd] = useState(formatTimecode(initial?.end ?? null));
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const api = useRef<StageApi | null>(null);

  const source = sources.find((s) => s.id === sourceId) ?? null;
  const canMark = source?.kind === "file" || source?.kind === "youtube";

  function mark(which: "start" | "end") {
    const t = Math.floor(api.current?.getTime() ?? 0);
    if (which === "start") setStart(formatTimecode(t));
    else setEnd(formatTimecode(t));
    setPreview(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <form
        className="card max-h-[94vh] w-full max-w-3xl space-y-3 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        action={(fd) => {
          setError(null);
          startTransition(async () => {
            const res = initial ? await updateClip(initial.id, fd) : await createClip(fd);
            if (res.error) setError(res.error);
            else onClose();
          });
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{initial ? "Modifier le clip" : "Nouveau clip"}</h2>
          <button type="button" className="text-xl leading-none" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>

        {sources.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-faint)" }}>
            Aucune vidéo dans la bibliothèque. Ajoute d&apos;abord une vidéo (fichier ou lien YouTube) dans la
            Bibliothèque, puis découpe-la ici en clips.
          </p>
        ) : (
          <>
            <input type="hidden" name="source_id" value={sourceId} />
            {!initial && (
              <select
                className="input"
                value={sourceId}
                onChange={(e) => {
                  setSourceId(e.target.value);
                  setPreview(false);
                }}
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            )}

            {source && (
              <VideoStage
                key={`${source.id}-${preview ? `${start}-${end}` : "free"}`}
                source={source}
                start={preview ? (parseTimecode(start) ?? 0) : 0}
                end={preview ? parseTimecode(end) : null}
                autoplay={preview}
                apiRef={api}
              />
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div>
                <label className="label">Début</label>
                <input className="input" name="start" value={start} onChange={(e) => setStart(e.target.value)} placeholder="0:00" inputMode="numeric" />
                {canMark && (
                  <button type="button" className="mt-1 text-xs" style={{ color: "var(--brand)" }} onClick={() => mark("start")}>
                    ⏺ Début = position actuelle
                  </button>
                )}
              </div>
              <div>
                <label className="label">Fin</label>
                <input className="input" name="end" value={end} onChange={(e) => setEnd(e.target.value)} placeholder="0:30" inputMode="numeric" />
                {canMark && (
                  <button type="button" className="mt-1 text-xs" style={{ color: "var(--brand)" }} onClick={() => mark("end")}>
                    ⏹ Fin = position actuelle
                  </button>
                )}
              </div>
              <div className="col-span-2 flex items-end sm:col-span-1">
                <button type="button" className="btn-secondary w-full" onClick={() => setPreview(true)} disabled={!canMark}>
                  ▶ Aperçu du clip
                </button>
              </div>
            </div>

            <input className="input" name="title" defaultValue={initial?.title ?? ""} placeholder="Titre du clip (ex. Pick & roll réussi)" required maxLength={200} />
            <textarea className="input min-h-20" name="note" defaultValue={initial?.note ?? ""} placeholder="Commentaire du coach : ce qu'il faut voir, corriger…" maxLength={1000} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input" name="tags" defaultValue={initial?.tags.join(", ") ?? ""} placeholder="Tags (tir, défense, U13…)" />
              <select className="input" name="player_id" defaultValue={initial?.playerId ?? ""}>
                <option value="">Aucun joueur lié</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {error && (
          <p className="text-sm" style={{ color: "#ff6b6b" }}>
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          {sources.length > 0 && (
            <button className="btn-primary" disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer le clip"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
