"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
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
  const [picking, setPicking] = useState(false);
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
          <button className="btn-primary" onClick={() => setPicking(true)}>
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
            ? "Aucun clip. Importe d'abord une vidéo (onglet Vidéos), puis marque le début et la fin."
            : "Aucun clip ne correspond."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const d = clipDuration(c);
            return (
              <div key={c.id} className="card min-w-0 !p-3">
                <Link
                  href={`/videos/clip/${c.id}`}
                  className="relative block w-full overflow-hidden rounded-lg bg-black"
                  style={{ aspectRatio: "16 / 9" }}
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
                </Link>
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
                    <Link style={{ color: "var(--brand)" }} href={`/videos/editeur/${c.source.id}?clip=${c.id}`}>Modifier</Link>
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

      {picking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPicking(false)}>
          <div className="card w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Choisir la vidéo à découper</h2>
              <button className="text-xl leading-none" onClick={() => setPicking(false)} aria-label="Fermer">×</button>
            </div>
            {sources.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-faint)" }}>
                Aucune vidéo pour l&apos;instant.{" "}
                <Link href="/videos?vue=videos" style={{ color: "var(--brand)" }}>Importer une vidéo →</Link>
              </p>
            ) : (
              <ul className="max-h-80 space-y-1.5 overflow-y-auto">
                {sources.map((s) => (
                  <li key={s.id}>
                    <Link href={`/videos/editeur/${s.id}`} className="block truncate rounded-lg border p-2.5 text-sm" style={{ borderColor: "var(--border)" }}>
                      ▶ {s.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
