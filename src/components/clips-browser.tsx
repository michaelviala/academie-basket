"use client";

import { useMemo, useState, useTransition } from "react";
import { ClipModal } from "@/components/clip-modal";
import { VideoStage } from "@/components/video-stage";
import { formatTimecode, normalize } from "@/lib/library";
import { clipDuration, type ClipView, type VideoSourceInfo } from "@/lib/videos";
import { deleteClip } from "@/app/(app)/videos/actions";

export function ClipsBrowser({
  clips,
  sources,
  players,
  systems,
  canEdit,
}: {
  clips: ClipView[];
  sources: VideoSourceInfo[];
  players: { id: string; first_name: string; last_name: string }[];
  systems: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [editing, setEditing] = useState<ClipView | "new" | null>(null);
  const [watching, setWatching] = useState<ClipView | null>(null);
  const [, startTransition] = useTransition();

  const tags = useMemo(
    () => Array.from(new Set(clips.flatMap((c) => c.tags))).sort(),
    [clips],
  );
  const filtered = useMemo(() => {
    const n = normalize(q.trim());
    return clips.filter(
      (c) =>
        (!tag || c.tags.includes(tag)) &&
        (!n ||
          normalize(`${c.title} ${c.note ?? ""} ${c.playerName ?? ""} ${c.source.title} ${c.tags.join(" ")}`).includes(n)),
    );
  }, [clips, q, tag]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input className="input min-w-0 flex-1 sm:max-w-sm" placeholder="Rechercher un clip, un joueur, un tag…" value={q} onChange={(e) => setQ(e.target.value)} />
        {canEdit && (
          <button className="btn-primary" onClick={() => setEditing("new")}>
            ✂ Nouveau clip
          </button>
        )}
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {["", ...tags].map((t) => (
            <button
              key={t || "all"}
              className="chip"
              onClick={() => setTag(t)}
              style={tag === t ? { background: "var(--brand)", color: "#fff", borderColor: "var(--brand)" } : undefined}
            >
              {t ? `#${t}` : "Tous"}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty">
          {clips.length === 0
            ? "Aucun clip. Choisis une vidéo de la bibliothèque, marque le début et la fin, et enregistre."
            : "Aucun clip ne correspond."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const d = clipDuration(c);
            return (
              <div key={c.id} className="card min-w-0 !p-3">
                <button
                  type="button"
                  className="relative block w-full overflow-hidden rounded-lg bg-black"
                  style={{ aspectRatio: "16 / 9" }}
                  onClick={() => setWatching(c)}
                  aria-label={`Lire ${c.title}`}
                >
                  {c.source.thumbUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.source.thumbUrl} alt="" className="h-full w-full object-cover opacity-80" />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center text-4xl text-white drop-shadow">▶</span>
                  <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                    {formatTimecode(c.start)}
                    {c.end !== null ? ` → ${formatTimecode(c.end)}` : ""}
                    {d !== null ? ` · ${d} s` : ""}
                  </span>
                </button>
                <p className="mt-2 truncate font-semibold">{c.title}</p>
                <p className="truncate text-xs" style={{ color: "var(--text-faint)" }}>
                  {c.source.title}
                  {c.playerName ? ` · ${c.playerName}` : ""}
                </p>
                {c.note && <p className="mt-1 line-clamp-2 text-sm">{c.note}</p>}
                {c.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.tags.map((t) => (
                      <span key={t} className="badge">#{t}</span>
                    ))}
                  </div>
                )}
                {canEdit && c.canEdit && (
                  <div className="mt-2 flex gap-3 text-xs">
                    <button style={{ color: "var(--brand)" }} onClick={() => setEditing(c)}>Modifier</button>
                    <button
                      style={{ color: "#ff6b6b" }}
                      onClick={() => {
                        if (confirm(`Supprimer le clip « ${c.title} » ?`)) startTransition(() => void deleteClip(c.id));
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ClipModal
          sources={sources}
          players={players}
          systems={systems}
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}

      {watching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3" onClick={() => setWatching(null)}>
          <div className="w-full max-w-3xl space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between text-white">
              <p className="truncate font-semibold">{watching.title}</p>
              <button className="text-2xl leading-none" onClick={() => setWatching(null)} aria-label="Fermer">×</button>
            </div>
            <VideoStage source={watching.source} start={watching.start} end={watching.end} autoplay />
            {watching.note && <p className="text-sm text-white/80">{watching.note}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
