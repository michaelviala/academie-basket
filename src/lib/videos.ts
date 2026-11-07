/** Types et utilitaires partagés du module vidéo (clips et montages). */

export const VIDEO_EDIT_ROLES = ["admin", "directeur_sportif", "coach"];

export type VideoSourceInfo = {
  id: string;
  title: string;
  /** file = fichier hébergé / lien direct, youtube = lecteur YouTube, other = lien non lisible ici */
  kind: "file" | "youtube" | "other";
  url: string | null;
  ytId: string | null;
  thumbUrl: string | null;
};

export type ClipView = {
  id: string;
  title: string;
  start: number;
  end: number | null;
  note: string | null;
  tags: string[];
  playerId: string | null;
  playerName: string | null;
  systemId: string | null;
  source: VideoSourceInfo;
  canEdit: boolean;
};

export type MontageView = {
  id: string;
  title: string;
  description: string | null;
  clipIds: string[];
  author: string | null;
  canEdit: boolean;
};

export function clipDuration(c: { start: number; end: number | null }) {
  return c.end !== null ? Math.max(0, c.end - c.start) : null;
}

export function totalDuration(clips: { start: number; end: number | null }[]) {
  let sum = 0;
  let known = true;
  for (const c of clips) {
    const d = clipDuration(c);
    if (d === null) known = false;
    else sum += d;
  }
  return { seconds: sum, complete: known };
}

export function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m} min ${String(s).padStart(2, "0")} s` : `${s} s`;
}

/** m:ss (ou m:ss.d avec `fine`). */
export function fmtT(sec: number, fine = false) {
  const t = Math.max(0, sec || 0);
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return fine
    ? `${m}:${s.toFixed(1).padStart(4, "0")}`
    : `${m}:${String(Math.floor(s)).padStart(2, "0")}`;
}

/** Lit « 1:23.4 », « 83 » ou « 1:23 » en secondes (décimales admises). */
export function parseT(raw: string): number | null {
  const v = raw.trim().replace(",", ".");
  if (!v) return null;
  const parts = v.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n) || n < 0) || parts.length > 3) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

/** Construit la source vidéo lisible (fichier signé, YouTube, ou lien non lisible). */
export function buildSource(
  r: {
    id: string;
    title: string;
    file_path: string | null;
    thumbnail_path: string | null;
    video_url: string | null;
  },
  signed: Map<string, string>,
  helpers: {
    youtubeId: (u: string | null | undefined) => string | null;
    isDirect: (u: string) => boolean;
  },
): VideoSourceInfo {
  const yt = helpers.youtubeId(r.video_url);
  const kind: VideoSourceInfo["kind"] = r.file_path
    ? "file"
    : yt
      ? "youtube"
      : r.video_url && helpers.isDirect(r.video_url)
        ? "file"
        : "other";
  return {
    id: r.id,
    title: r.title,
    kind,
    url: r.file_path ? (signed.get(r.file_path) ?? null) : r.video_url,
    ytId: yt,
    thumbUrl: r.thumbnail_path
      ? (signed.get(r.thumbnail_path) ?? null)
      : yt
        ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`
        : null,
  };
}

/** Une vidéo de la liste générale, avec ce qui permet de la retrouver (joueur, séance, coach). */
export type VideoRow = {
  source: VideoSourceInfo;
  createdAt: string;
  coachId: string | null;
  coachName: string | null;
  players: { id: string; name: string }[];
  trainings: { id: string; label: string }[];
  clipCount: number;
  firstClipId: string | null;
};
