/** Utilitaires partagés de la bibliothèque (fonctions pures). */

export const LIBRARY_EDIT_ROLES = [
  "admin",
  "directeur_sportif",
  "coach",
  "preparateur_physique",
];
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export type LibraryItem = {
  id: string;
  kind: "document" | "video";
  title: string;
  description: string | null;
  tags: string[];
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  video_url: string | null;
  start_seconds: number | null;
  end_seconds: number | null;
  created_at: string;
  created_by: string | null;
  /** Lien signé temporaire (fichier hébergé), calculé côté serveur. */
  signedUrl: string | null;
  /** Vignette (lien signé), ou miniature YouTube. */
  thumbUrl: string | null;
  hasStoredThumb: boolean;
  author: string | null;
  canDelete: boolean;
  /** Mis en favori par l'utilisateur connecté. */
  isFavorite: boolean;
  /** Document « à connaître » pour tout le staff (choisi par la direction). */
  essential: boolean;
  /** L'utilisateur peut marquer un document « à connaître » (direction). */
  canMarkEssential: boolean;
};

/** « Tir, Défense ; U13 » → ["tir", "défense", "u13"] (minuscules, sans doublon, 12 max). */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(/[,;\n]/)) {
    const t = part.replace(/^#/, "").trim().toLowerCase().slice(0, 30);
    if (t) seen.add(t);
  }
  return Array.from(seen).slice(0, 12);
}

/** « 1:30 », « 90 » ou « 1:02:03 » → secondes (null si vide ou invalide). */
export function parseTimecode(raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;
  const parts = v.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n) || n < 0) || parts.length > 3)
    return null;
  return Math.round(parts.reduce((acc, n) => acc * 60 + n, 0));
}

export function formatTimecode(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function fileKind(
  mime: string | null | undefined,
  name?: string | null,
): "pdf" | "image" | "video" | "sheet" | "doc" | "slides" | "other" {
  const m = mime ?? "";
  const ext = (name ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (m === "application/pdf" || ext === "pdf") return "pdf";
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (["xls", "xlsx", "csv", "ods"].includes(ext)) return "sheet";
  if (["doc", "docx", "odt", "txt", "rtf", "md"].includes(ext)) return "doc";
  if (["ppt", "pptx", "odp", "key"].includes(ext)) return "slides";
  return "other";
}

export type VideoSource =
  | { type: "embed"; src: string }
  | { type: "file"; src: string }
  | { type: "link"; src: string };

/** Choisit le lecteur : YouTube / Vimeo en iframe, fichier ou lien direct en <video>, sinon simple lien. */
export function videoSource(
  url: string,
  start: number | null,
  end: number | null,
): VideoSource {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    let ytId: string | null = null;
    if (host === "youtu.be") ytId = u.pathname.slice(1);
    else if (host.endsWith("youtube.com"))
      ytId =
        u.searchParams.get("v") ??
        u.pathname.match(/\/(?:embed|shorts)\/([\w-]{6,})/)?.[1] ??
        null;
    if (ytId) {
      const q = new URLSearchParams({ rel: "0" });
      if (start !== null) q.set("start", String(start));
      if (end !== null) q.set("end", String(end));
      return {
        type: "embed",
        src: `https://www.youtube-nocookie.com/embed/${ytId}?${q}`,
      };
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = u.pathname.match(/(\d{5,})/)?.[1];
      if (id)
        return {
          type: "embed",
          src: `https://player.vimeo.com/video/${id}${start !== null ? `#t=${start}s` : ""}`,
        };
    }
    if (/\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u.pathname))
      return { type: "file", src: withFragment(url, start, end) };
  } catch {
    /* lien invalide : repli sur un simple lien */
  }
  return { type: "link", src: url };
}

/** Fragment média « #t=début,fin » : le lecteur ne joue que la séquence. */
export function withFragment(
  url: string,
  start: number | null,
  end: number | null,
): string {
  if (start === null && end === null) return url;
  return `${url.split("#")[0]}#t=${start ?? 0}${end !== null ? `,${end}` : ""}`;
}

/** Minuscules sans accents, pour la recherche. */
export const normalize = (v: string) =>
  v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.slice(1) || null;
    if (host.endsWith("youtube.com")) return u.searchParams.get("v") ?? u.pathname.match(/\/(?:embed|shorts)\/([\w-]{6,})/)?.[1] ?? null;
  } catch {
    /* lien invalide */
  }
  return null;
}
