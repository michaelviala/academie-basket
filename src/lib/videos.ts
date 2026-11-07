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
