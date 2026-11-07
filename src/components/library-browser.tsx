"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  addLibraryItem,
  deleteLibraryItem,
  setLibraryThumbnail,
  updateLibraryTags,
} from "@/app/(app)/bibliotheque/actions";
import { makeThumbnail } from "@/lib/library-thumbnail";
import {
  MAX_FILE_BYTES,
  fileKind,
  formatSize,
  formatTimecode,
  normalize,
  parseTimecode,
  videoSource,
  withFragment,
  type LibraryItem,
} from "@/lib/library";

const PdfViewer = dynamic(() => import("@/components/pdf-viewer"), {
  ssr: false,
  loading: () => (
    <p
      className="p-6 text-center text-sm"
      style={{ color: "var(--text-faint)" }}
    >
      Chargement du PDF…
    </p>
  ),
});

type KindFilter = "all" | "document" | "video";

const FILE_STYLE: Record<
  ReturnType<typeof fileKind>,
  { icon: string; color: string; label: string }
> = {
  pdf: { icon: "PDF", color: "#ef4444", label: "PDF" },
  image: { icon: "IMG", color: "#a855f7", label: "Image" },
  video: { icon: "▶", color: "#3987e5", label: "Vidéo" },
  sheet: { icon: "XLS", color: "#199e70", label: "Tableur" },
  doc: { icon: "DOC", color: "#3b82f6", label: "Document" },
  slides: { icon: "PPT", color: "#d95926", label: "Présentation" },
  other: { icon: "FILE", color: "#8b8f99", label: "Fichier" },
};

const tint = (c: string, pct: number) =>
  `color-mix(in srgb, ${c} ${pct}%, transparent)`;

function styleOf(item: LibraryItem) {
  if (item.kind === "video") return FILE_STYLE.video;
  return FILE_STYLE[fileKind(item.mime_type, item.file_name)];
}

const dateFr = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function LibraryBrowser({
  items,
  canAdd,
}: {
  items: LibraryItem[];
  canAdd: boolean;
}) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((i) =>
      i.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)),
    );
    return Array.from(counts.entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
  }, [items]);

  const shown = useMemo(() => {
    const tokens = normalize(q).split(/\s+/).filter(Boolean);
    return items.filter((i) => {
      if (kind !== "all" && i.kind !== kind) return false;
      if (!activeTags.every((t) => i.tags.includes(t))) return false;
      if (tokens.length === 0) return true;
      const hay = normalize(
        [
          i.title,
          i.description ?? "",
          i.tags.join(" "),
          i.file_name ?? "",
          i.author ?? "",
        ].join(" "),
      );
      return tokens.every((t) => hay.includes(t));
    });
  }, [items, q, kind, activeTags]);

  // Vignettes générées à la volée pour les anciens éléments (aperçu immédiat, enregistrées pour la suite)
  const [localThumbs, setLocalThumbs] = useState<Record<string, string>>({});
  const attempted = useRef<Set<string>>(new Set());
  const busy = useRef(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (busy.current) return;
    const todo = items.find(
      (i) =>
        !i.hasStoredThumb &&
        !i.thumbUrl &&
        i.canDelete &&
        i.signedUrl &&
        !attempted.current.has(i.id) &&
        (i.kind === "video" || fileKind(i.mime_type, i.file_name) !== "other"),
    );
    if (!todo || !todo.signedUrl) return;
    attempted.current.add(todo.id);
    busy.current = true;
    (async () => {
      try {
        const blob = await makeThumbnail(
          todo.signedUrl!,
          todo.mime_type,
          todo.file_name,
          todo.start_seconds ?? 1,
        );
        if (!blob) return;
        const path = `thumbs/${crypto.randomUUID()}.jpg`;
        const { error } = await createClient()
          .storage.from("library")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (error) return;
        await setLibraryThumbnail(todo.id, path);
        setLocalThumbs((cur) => ({
          ...cur,
          [todo.id]: URL.createObjectURL(blob),
        }));
      } finally {
        busy.current = false;
        setTick((t) => t + 1);
      }
    })();
  }, [items, tick]);

  const opened = openId ? (items.find((i) => i.id === openId) ?? null) : null;
  const toggleTag = (t: string) =>
    setActiveTags((cur) =>
      cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t],
    );
  const counts = {
    all: items.length,
    document: items.filter((i) => i.kind === "document").length,
    video: items.filter((i) => i.kind === "video").length,
  };

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center gap-3">
        <input
          className="input min-w-0 flex-1"
          type="search"
          autoComplete="off"
          placeholder="Rechercher un document, une vidéo, un tag…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {canAdd && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => setAdding(true)}
          >
            + Ajouter
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="seg">
          {(
            [
              ["all", "Tout"],
              ["document", "Documents"],
              ["video", "Vidéos"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${kind === k ? "active" : ""}`}
              style={
                kind === k
                  ? { background: "var(--brand)", color: "#fff" }
                  : { color: "var(--text-faint)" }
              }
            >
              {label} ({counts[k]})
            </button>
          ))}
        </div>
        {(activeTags.length > 0 || q || kind !== "all") && (
          <button
            type="button"
            className="text-xs"
            style={{ color: "var(--text-faint)" }}
            onClick={() => {
              setQ("");
              setKind("all");
              setActiveTags([]);
            }}
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTags.map(([t, n]) => {
            const on = activeTags.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  background: on ? "var(--brand)" : "var(--surf-2)",
                  color: on ? "#fff" : "var(--text-dim)",
                  border: `1px solid ${on ? "var(--brand)" : "var(--border)"}`,
                }}
              >
                #{t} <span style={{ opacity: 0.6 }}>{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="empty">
          <p
            className="display text-xl font-bold uppercase"
            style={{ color: "var(--text-dim)" }}
          >
            {items.length === 0 ? "La bibliothèque est vide" : "Aucun résultat"}
          </p>
          <p className="mt-1 text-sm">
            {items.length === 0
              ? "Ajoute un premier document ou une séquence vidéo."
              : "Essaie d'autres mots ou retire un tag."}
          </p>
          {items.length === 0 && canAdd && (
            <button
              type="button"
              className="btn-primary mt-4"
              onClick={() => setAdding(true)}
            >
              + Ajouter
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((i) => {
            const st = styleOf(i);
            const thumb = localThumbs[i.id] ?? i.thumbUrl;
            return (
              <div
                key={i.id}
                className="card flex min-w-0 cursor-pointer flex-col gap-3 transition-transform hover:-translate-y-0.5"
                style={{ borderTop: `3px solid ${st.color}` }}
                onClick={() => setOpenId(i.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setOpenId(i.id)}
              >
                {thumb && (
                  <div
                    className="relative aspect-[16/10] overflow-hidden rounded-lg"
                    style={{ background: "var(--surf-2)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumb}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    {i.kind === "video" && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span
                          className="flex h-12 w-12 items-center justify-center rounded-full text-lg text-white"
                          style={{ background: "rgba(0,0,0,0.6)" }}
                        >
                          ▶
                        </span>
                      </span>
                    )}
                    <span
                      className="absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ background: st.color, color: "#fff" }}
                    >
                      {st.icon}
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  {!thumb && (
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
                      style={{
                        background: tint(st.color, 18),
                        color: st.color,
                      }}
                    >
                      {st.icon}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold" title={i.title}>
                      {i.title}
                    </p>
                    <p
                      className="truncate text-xs"
                      style={{ color: "var(--text-faint)" }}
                    >
                      {st.label}
                      {i.file_size ? ` · ${formatSize(i.file_size)}` : ""}
                      {i.kind === "video" &&
                      (i.start_seconds !== null || i.end_seconds !== null)
                        ? ` · séquence ${formatTimecode(i.start_seconds ?? 0)} → ${i.end_seconds !== null ? formatTimecode(i.end_seconds) : "fin"}`
                        : ""}
                    </p>
                  </div>
                </div>
                {i.description && (
                  <p
                    className="line-clamp-2 text-xs"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {i.description}
                  </p>
                )}
                <div className="mt-auto flex flex-wrap gap-1.5">
                  {i.tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="chip"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTag(t);
                      }}
                    >
                      #{t}
                    </button>
                  ))}
                </div>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--text-faint)" }}
                >
                  {dateFr(i.created_at)}
                  {i.author ? ` · ${i.author}` : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {opened && (
        <ItemModal
          item={opened}
          knownTags={allTags.map(([t]) => t)}
          onClose={() => setOpenId(null)}
        />
      )}
      {adding && (
        <AddModal
          knownTags={allTags.map(([t]) => t)}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}

function Overlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card my-auto w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ItemModal({
  item,
  knownTags,
  onClose,
}: {
  item: LibraryItem;
  knownTags: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editTags, setEditTags] = useState(false);
  const [tagText, setTagText] = useState(item.tags.join(", "));
  const st = styleOf(item);

  // Plein écran : natif quand le navigateur le permet, sinon (iPhone…) plein cadre du site
  const stageRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  function enterFull() {
    setFull(true);
    const el = stageRef.current as
      (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    try {
      if (el?.requestFullscreen) void el.requestFullscreen().catch(() => {});
      else el?.webkitRequestFullscreen?.();
    } catch {
      /* le mode plein cadre du site prend le relais */
    }
  }
  function exitFull() {
    setFull(false);
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
  }
  useEffect(() => {
    if (!full) return;
    const onChange = () => {
      if (!document.fullscreenElement) setFull(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      window.removeEventListener("keydown", onKey);
    };
  }, [full]);

  const media = (() => {
    if (item.kind === "video") {
      if (item.signedUrl)
        return {
          type: "file" as const,
          src: withFragment(
            item.signedUrl,
            item.start_seconds,
            item.end_seconds,
          ),
        };
      if (item.video_url)
        return videoSource(
          item.video_url,
          item.start_seconds,
          item.end_seconds,
        );
      return null;
    }
    const fk = fileKind(item.mime_type, item.file_name);
    if (!item.signedUrl) return null;
    if (fk === "pdf") return { type: "pdf" as const, src: item.signedUrl };
    if (fk === "image") return { type: "image" as const, src: item.signedUrl };
    return null;
  })();

  function saveTags() {
    setError(null);
    startTransition(async () => {
      const r = await updateLibraryTags(item.id, tagText);
      if (r.error) setError(r.error);
      else {
        setEditTags(false);
        router.refresh();
      }
    });
  }

  function remove() {
    if (!window.confirm(`Supprimer « ${item.title} » définitivement ?`)) return;
    setError(null);
    startTransition(async () => {
      const r = await deleteLibraryItem(item.id);
      if (r.error) setError(r.error);
      else {
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: st.color }}
          >
            {st.label}
          </p>
          <h3 className="display text-2xl font-bold uppercase leading-tight">
            {item.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-2xl leading-none"
          style={{ color: "var(--text-faint)" }}
          aria-label="Fermer"
        >
          ×
        </button>
      </div>

      <div className="mt-4">
        {media && media.type !== "link" && !full && (
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: "4px 12px", fontSize: 12 }}
              onClick={enterFull}
            >
              ⛶ Plein écran
            </button>
          </div>
        )}
        <div
          ref={stageRef}
          className={
            full ? "fixed inset-0 z-[80] flex flex-col bg-black p-2 sm:p-4" : ""
          }
        >
          {full && (
            <div className="mb-2 flex items-center justify-between gap-3 text-white">
              <p className="truncate text-sm font-semibold">{item.title}</p>
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.15)" }}
                onClick={exitFull}
              >
                ✕ Quitter le plein écran
              </button>
            </div>
          )}
          <div className={full ? "min-h-0 flex-1" : ""}>
            {media?.type === "embed" && (
              <div
                className={`overflow-hidden rounded-lg bg-black ${full ? "h-full" : "aspect-video"}`}
              >
                <iframe
                  src={media.src}
                  className="h-full w-full"
                  allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  title={item.title}
                />
              </div>
            )}
            {media?.type === "file" && (
              <video
                src={media.src}
                controls
                playsInline
                preload="metadata"
                className={`w-full rounded-lg bg-black ${full ? "h-full" : "aspect-video"}`}
              />
            )}
            {media?.type === "pdf" && (
              <PdfViewer url={media.src} title={item.title} fullscreen={full} />
            )}
            {media?.type === "image" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={media.src}
                alt={item.title}
                className={`w-full rounded-lg object-contain ${full ? "h-full" : "max-h-[60vh]"}`}
                style={{ background: full ? "transparent" : "var(--surf-2)" }}
              />
            )}
            {(media?.type === "link" || !media) && (
              <div
                className="rounded-lg p-4 text-sm"
                style={{
                  background: "var(--surf-2)",
                  color: "var(--text-dim)",
                }}
              >
                Aperçu indisponible pour ce format : utilise le bouton
                ci-dessous pour ouvrir le fichier.
              </div>
            )}
          </div>
        </div>
      </div>

      {item.kind === "video" &&
        (item.start_seconds !== null || item.end_seconds !== null) && (
          <p className="mt-2 text-xs" style={{ color: "var(--text-faint)" }}>
            Séquence : {formatTimecode(item.start_seconds ?? 0)} →{" "}
            {item.end_seconds !== null
              ? formatTimecode(item.end_seconds)
              : "fin de la vidéo"}
          </p>
        )}

      {item.description && (
        <p className="mt-3 whitespace-pre-wrap text-sm">{item.description}</p>
      )}

      <div className="mt-3">
        {!editTags ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {item.tags.length === 0 && (
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                Aucun tag
              </span>
            )}
            {item.tags.map((t) => (
              <span key={t} className="chip">
                #{t}
              </span>
            ))}
            {item.canDelete && (
              <button
                type="button"
                className="text-xs underline"
                style={{ color: "var(--text-faint)" }}
                onClick={() => setEditTags(true)}
              >
                Modifier les tags
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <TagField value={tagText} onChange={setTagText} known={knownTags} />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary"
                disabled={pending}
                onClick={saveTags}
              >
                {pending ? "…" : "Enregistrer"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditTags(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px]" style={{ color: "var(--text-faint)" }}>
        Ajouté le {dateFr(item.created_at)}
        {item.author ? ` par ${item.author}` : ""}
        {item.file_name ? ` · ${item.file_name}` : ""}
        {item.file_size ? ` (${formatSize(item.file_size)})` : ""}
      </p>
      {error && (
        <p className="mt-2 text-xs" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {(item.signedUrl || item.video_url) && (
          <a
            className="btn-primary"
            href={item.signedUrl ?? item.video_url ?? "#"}
            target="_blank"
            rel="noreferrer"
            download={item.signedUrl ? (item.file_name ?? true) : undefined}
          >
            {item.signedUrl ? "Télécharger / ouvrir" : "Ouvrir la vidéo"}
          </a>
        )}
        {item.canDelete && (
          <button
            type="button"
            className="btn-secondary"
            style={{ color: "#f87171" }}
            disabled={pending}
            onClick={remove}
          >
            Supprimer
          </button>
        )}
        <button type="button" className="btn-secondary" onClick={onClose}>
          Fermer
        </button>
      </div>
    </Overlay>
  );
}

function TagField({
  value,
  onChange,
  known,
}: {
  value: string;
  onChange: (v: string) => void;
  known: string[];
}) {
  const current = value
    .split(/[,;]/)
    .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
    .filter(Boolean);
  const suggestions = known.filter((t) => !current.includes(t)).slice(0, 12);
  return (
    <div className="space-y-2">
      <input
        className="input w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tags séparés par des virgules (ex. tir, u13, échauffement)"
      />
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((t) => (
            <button
              key={t}
              type="button"
              className="chip"
              onClick={() =>
                onChange(
                  value.trim()
                    ? `${value.trim().replace(/[,;]$/, "")}, ${t}`
                    : t,
                )
              }
            >
              + #{t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddModal({
  knownTags,
  onClose,
}: {
  knownTags: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"document" | "video">("document");
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("kind", kind);
    fd.set("tags", tags);
    if (!String(fd.get("title") ?? "").trim() && file)
      fd.set("title", file.name.replace(/\.[^.]+$/, ""));

    if (file && file.size > MAX_FILE_BYTES)
      return setError("Fichier trop lourd (50 Mo max).");
    if (kind === "document" && !file)
      return setError("Choisis un fichier à ajouter.");
    if (kind === "video" && !file && !String(fd.get("video_url") ?? "").trim())
      return setError("Ajoute un fichier vidéo ou colle un lien.");

    setBusy(true);
    let uploadedPath: string | null = null;
    const supabase = createClient();
    if (file) {
      const safe = file.name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^\w.\-]+/g, "_")
        .slice(-80);
      uploadedPath = `${crypto.randomUUID()}/${safe}`;
      const { error: upErr } = await supabase.storage
        .from("library")
        .upload(uploadedPath, file, { contentType: file.type || undefined });
      if (upErr) {
        setBusy(false);
        return setError(`Envoi impossible : ${upErr.message}`);
      }
      fd.set("file_path", uploadedPath);
      fd.set("file_name", file.name);
      fd.set("file_size", String(file.size));
      fd.set("mime_type", file.type);
    }

    let thumbPath: string | null = null;
    if (file) {
      const start = parseTimecode(String(fd.get("start") ?? ""));
      const blob = await makeThumbnail(file, file.type, file.name, start ?? 1);
      if (blob) {
        const tp = `thumbs/${crypto.randomUUID()}.jpg`;
        const { error: thErr } = await supabase.storage
          .from("library")
          .upload(tp, blob, { contentType: "image/jpeg" });
        if (!thErr) thumbPath = tp;
      }
    }
    if (thumbPath) fd.set("thumbnail_path", thumbPath);

    const r = await addLibraryItem(fd);
    if (r.error) {
      const orphans = [uploadedPath, thumbPath].filter((p): p is string => !!p);
      if (orphans.length > 0)
        await supabase.storage.from("library").remove(orphans);
      setBusy(false);
      return setError(r.error);
    }
    router.refresh();
    onClose();
  }

  return (
    <Overlay onClose={busy ? () => {} : onClose}>
      <div className="flex items-center justify-between">
        <h3 className="display text-2xl font-bold uppercase">
          Ajouter à la bibliothèque
        </h3>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="text-2xl leading-none"
          style={{ color: "var(--text-faint)" }}
          aria-label="Fermer"
        >
          ×
        </button>
      </div>

      <div className="seg mt-4">
        {(
          [
            ["document", "Document"],
            ["video", "Séquence vidéo"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${kind === k ? "active" : ""}`}
            style={
              kind === k
                ? { background: "var(--brand)", color: "#fff" }
                : { color: "var(--text-faint)" }
            }
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          className="input sm:col-span-2"
          name="title"
          placeholder="Titre (ex. Fiche exercice : tir en mouvement)"
        />

        <label
          className="sm:col-span-2 text-xs"
          style={{ color: "var(--text-faint)" }}
        >
          {kind === "document"
            ? "Fichier (PDF, Word, Excel, image… 50 Mo max)"
            : "Fichier vidéo (mp4… 50 Mo max) — ou colle un lien ci-dessous"}
          <input
            className="input mt-1 w-full"
            type="file"
            accept={kind === "video" ? "video/*" : undefined}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {kind === "video" && (
          <>
            <input
              className="input sm:col-span-2"
              name="video_url"
              placeholder="…ou lien YouTube / Vimeo / vidéo (https://…)"
              disabled={!!file}
            />
            <label className="text-xs" style={{ color: "var(--text-faint)" }}>
              Début de la séquence
              <input
                className="input mt-1 w-full"
                name="start"
                placeholder="ex. 1:30"
                inputMode="numeric"
              />
            </label>
            <label className="text-xs" style={{ color: "var(--text-faint)" }}>
              Fin de la séquence
              <input
                className="input mt-1 w-full"
                name="end"
                placeholder="ex. 2:05"
                inputMode="numeric"
              />
            </label>
          </>
        )}

        <div className="sm:col-span-2">
          <TagField value={tags} onChange={setTags} known={knownTags} />
        </div>
        <textarea
          className="input sm:col-span-2"
          name="description"
          rows={3}
          placeholder="Description (optionnel)"
        />

        {error && (
          <p className="text-xs sm:col-span-2" style={{ color: "#f87171" }}>
            {error}
          </p>
        )}
        <button
          className="btn-primary sm:col-span-2"
          type="submit"
          disabled={busy}
        >
          {busy ? "Envoi en cours…" : "Ajouter"}
        </button>
      </form>
    </Overlay>
  );
}
