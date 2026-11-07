"use client";

import Link from "next/link";
import { useState } from "react";
import { AddModal } from "@/components/library-browser";
import type { VideoSourceInfo } from "@/lib/videos";

export function VideoSources({
  sources,
  clipCounts,
  canEdit,
}: {
  sources: VideoSourceInfo[];
  clipCounts: Record<string, number>;
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {canEdit && (
          <button className="btn-primary" onClick={() => setAdding(true)}>
            + Importer une vidéo
          </button>
        )}
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          Fichier mp4 (50 Mo max) ou lien YouTube. Elle apparaît ensuite ici, prête à être découpée en clips.
        </p>
      </div>

      {sources.length === 0 ? (
        <div className="empty">Aucune vidéo pour l&apos;instant. Importe un fichier ou colle un lien YouTube.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sources.map((s) => (
            <div key={s.id} className="card min-w-0 !p-3">
              <Link
                href={`/videos/editeur/${s.id}`}
                className="relative block overflow-hidden rounded-lg bg-black"
                style={{ aspectRatio: "16 / 9" }}
                aria-label={`Ouvrir ${s.title} dans l'éditeur`}
              >
                {s.thumbUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.thumbUrl} alt="" className="h-full w-full object-cover opacity-80" />
                )}
                <span className="absolute inset-0 flex items-center justify-center text-4xl text-white drop-shadow">✂</span>
              </Link>
              <p className="mt-2 truncate font-semibold">{s.title}</p>
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                {s.kind === "youtube" ? "YouTube" : s.kind === "file" ? "Fichier" : "Lien non lisible ici"} ·{" "}
                {clipCounts[s.id] ?? 0} clip{(clipCounts[s.id] ?? 0) > 1 ? "s" : ""}
              </p>
              {s.kind !== "other" && (
                <Link href={`/videos/editeur/${s.id}`} className="mt-2 inline-block text-xs" style={{ color: "var(--brand)" }}>
                  Ouvrir dans l&apos;éditeur →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
      {adding && <AddModal knownTags={[]} lockVideo onClose={() => setAdding(false)} />}
    </div>
  );
}
