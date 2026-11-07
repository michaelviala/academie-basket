"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AddModal } from "@/components/library-browser";
import type { VideoRow } from "@/lib/videos";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Liste générale de toutes les vidéos, filtrable par joueur, séance, coach, type. */
export function VideoLibrary({ rows, canEdit }: { rows: VideoRow[]; canEdit: boolean }) {
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [player, setPlayer] = useState("");
  const [training, setTraining] = useState("");
  const [coach, setCoach] = useState("");
  const [kind, setKind] = useState("");
  const [sort, setSort] = useState("recent");

  const players = useMemo(() => uniq(rows.flatMap((r) => r.players.map((p) => [p.id, p.name] as const))), [rows]);
  const trainings = useMemo(() => uniq(rows.flatMap((r) => r.trainings.map((t) => [t.id, t.label] as const))), [rows]);
  const coaches = useMemo(() => uniq(rows.flatMap((r) => (r.coachId && r.coachName ? [[r.coachId, r.coachName] as const] : []))), [rows]);

  const shown = useMemo(() => {
    const nq = norm(q.trim());
    const list = rows.filter(
      (r) =>
        (!nq || norm(`${r.source.title} ${r.players.map((p) => p.name).join(" ")} ${r.coachName ?? ""}`).includes(nq)) &&
        (!player || r.players.some((p) => p.id === player)) &&
        (!training || r.trainings.some((t) => t.id === training)) &&
        (!coach || r.coachId === coach) &&
        (!kind || r.source.kind === kind),
    );
    list.sort((a, b) =>
      sort === "titre" ? a.source.title.localeCompare(b.source.title, "fr") : b.createdAt.localeCompare(a.createdAt),
    );
    return list;
  }, [rows, q, player, training, coach, kind, sort]);

  const active = !!(q || player || training || coach || kind);
  const sel = "input !py-1.5 text-sm";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {canEdit && (
          <button className="btn-primary" onClick={() => setAdding(true)}>
            + Importer une vidéo
          </button>
        )}
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          Fichier mp4 (50 Mo max) ou lien YouTube. Les vidéos filmées depuis une séance ou une fiche joueur arrivent ici aussi.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <input className={`${sel} col-span-2 sm:col-span-3 lg:col-span-1`} placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={sel} value={player} onChange={(e) => setPlayer(e.target.value)} aria-label="Joueur">
          <option value="">Tous les joueurs</option>
          {players.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
        <select className={sel} value={training} onChange={(e) => setTraining(e.target.value)} aria-label="Séance">
          <option value="">Toutes les séances</option>
          {trainings.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
        <select className={sel} value={coach} onChange={(e) => setCoach(e.target.value)} aria-label="Coach">
          <option value="">Tous les coachs</option>
          {coaches.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
        <select className={sel} value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type">
          <option value="">Tous les types</option>
          <option value="file">Fichiers</option>
          <option value="youtube">YouTube</option>
        </select>
        <select className={sel} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Tri">
          <option value="recent">Plus récentes</option>
          <option value="titre">Titre A→Z</option>
        </select>
      </div>

      <p className="text-xs" style={{ color: "var(--text-faint)" }}>
        {shown.length} vidéo{shown.length > 1 ? "s" : ""}
        {active && (
          <>
            {" · "}
            <button className="underline" onClick={() => { setQ(""); setPlayer(""); setTraining(""); setCoach(""); setKind(""); }}>
              Effacer les filtres
            </button>
          </>
        )}
      </p>

      {shown.length === 0 ? (
        <div className="empty">{rows.length === 0 ? "Aucune vidéo pour l'instant. Importe un fichier ou colle un lien YouTube." : "Aucune vidéo ne correspond à ces filtres."}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((r) => {
            const s = r.source;
            const watch = r.firstClipId ? `/videos/clip/${r.firstClipId}` : s.kind !== "other" ? `/videos/editeur/${s.id}` : null;
            const date = new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
            return (
              <div key={s.id} className="card min-w-0 !p-3">
                {(() => {
                  const inner = (
                    <>
                      {s.thumbUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.thumbUrl} alt="" className="h-full w-full object-cover opacity-80" />
                      )}
                      <span className="absolute inset-0 flex items-center justify-center text-4xl text-white drop-shadow">▶</span>
                    </>
                  );
                  const cls = "relative block overflow-hidden rounded-lg bg-black";
                  return watch ? (
                    <Link href={watch} className={cls} style={{ aspectRatio: "16 / 9" }} aria-label={`Lire ${s.title}`}>{inner}</Link>
                  ) : (
                    <div className={cls} style={{ aspectRatio: "16 / 9" }}>{inner}</div>
                  );
                })()}
                <p className="mt-2 truncate font-semibold">{s.title}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {r.players.map((p) => <span key={p.id} className="chip">👤 {p.name}</span>)}
                  {r.trainings.map((t) => <span key={t.id} className="chip">🏀 {t.label}</span>)}
                </div>
                <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
                  {s.kind === "youtube" ? "YouTube" : s.kind === "file" ? "Fichier" : "Lien non lisible ici"} · {date}
                  {r.coachName && ` · ${r.coachName}`}
                  {r.clipCount > 0 && ` · ${r.clipCount} clip${r.clipCount > 1 ? "s" : ""}`}
                </p>
                {s.kind !== "other" && canEdit && (
                  <Link href={`/videos/editeur/${s.id}`} className="mt-2 inline-block text-xs" style={{ color: "var(--brand)" }}>
                    ✂ Découper / éditer →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
      {adding && <AddModal knownTags={[]} lockVideo onClose={() => setAdding(false)} />}
    </div>
  );
}

function uniq(pairs: (readonly [string, string])[]) {
  return [...new Map(pairs).entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"));
}
