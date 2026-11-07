import { createClient } from "@/lib/supabase/client";
import { makeThumbnail } from "@/lib/library-thumbnail";

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
/** Durée maximale d'une vidéo de feedback (exercice d'un joueur). */
export const FEEDBACK_MAX_SECONDS = 12;

/** Lit l'en-tête du fichier pour repérer un format que le navigateur ne sait pas afficher. */
export async function sniffCodec(file: Blob): Promise<"hevc" | "prores" | "av1" | "h264" | null> {
  try {
    const n = 4 * 1024 * 1024;
    const parts = [file.slice(0, n)];
    if (file.size > n) parts.push(file.slice(Math.max(n, file.size - n)));
    const txt = (await Promise.all(parts.map((b) => b.arrayBuffer())))
      .map((a) => new TextDecoder("latin1").decode(new Uint8Array(a)))
      .join("");
    if (/hvc1|hev1/.test(txt)) return "hevc";
    if (/apch|apcn|apcs|apco|ap4h/.test(txt)) return "prores";
    if (/av01/.test(txt)) return "av1";
    if (/avc1/.test(txt)) return "h264";
  } catch {
    /* lecture impossible */
  }
  return null;
}

export function videoDuration(file: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    const done = (d: number | null) => {
      v.removeAttribute("src");
      v.load();
      URL.revokeObjectURL(url);
      resolve(d);
    };
    v.preload = "metadata";
    v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? Math.round(v.duration * 100) / 100 : null);
    v.onerror = () => done(null);
    setTimeout(() => done(null), 8000);
    v.src = url;
  });
}

export type UploadedVideo = {
  filePath: string;
  thumbPath: string | null;
  fileName: string;
  fileSize: number;
  mime: string;
  duration: number;
};

export type UploadStage = "envoi" | "compression";

/** Envoie la vidéo puis la fait compresser en H.264 par le serveur (lisible partout, plus légère). */
export async function uploadVideo(
  file: File,
  onStage?: (s: UploadStage) => void,
  maxSeconds?: number,
): Promise<{ error: string } | { ok: UploadedVideo }> {
  if (file.size > MAX_VIDEO_BYTES)
    return { error: "Vidéo trop lourde (50 Mo max). Filme plus court." };

  if (maxSeconds) {
    const d = await videoDuration(file);
    if (d && d > maxSeconds + 0.7) return { error: `Vidéo trop longue (${Math.round(d)} s) : ${maxSeconds} secondes maximum.` };
  }
  const supabase = createClient();
  const safe = file.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.\-]+/g, "_")
    .slice(-80);
  const original = `${crypto.randomUUID()}/${safe || "video.mp4"}`;
  onStage?.("envoi");
  const { error } = await supabase.storage
    .from("library")
    .upload(original, file, { contentType: file.type || "video/mp4" });
  if (error) return { error: `Envoi impossible : ${error.message}` };

  onStage?.("compression");
  type Conv = { ok?: { filePath: string; thumbPath: string | null; duration: number; size: number }; error?: string; code?: string };
  let conv: Conv | null = null;
  try {
    const res = await fetch("/api/convert-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: original, maxSeconds }),
    });
    const text = (await res.text()).trim();
    conv = text ? (JSON.parse(text) as Conv) : { error: "Réponse vide du serveur." };
  } catch {
    conv = { error: "Compression interrompue (connexion perdue ?). Réessaie." };
  }

  if (conv.ok) {
    return {
      ok: {
        filePath: conv.ok.filePath,
        thumbPath: conv.ok.thumbPath,
        fileName: file.name.replace(/\.[^.]+$/, "") + ".mp4",
        fileSize: conv.ok.size,
        mime: "video/mp4",
        duration: conv.ok.duration,
      },
    };
  }

  // Compression indisponible : on garde l'original seulement s'il est lisible dans le navigateur
  if (conv.code === "no_ffmpeg") {
    const codec = await sniffCodec(file);
    const duration = await videoDuration(file);
    if (codec !== "hevc" && codec !== "prores" && duration) {
      let thumbPath: string | null = null;
      const blob = await makeThumbnail(file, file.type || "video/mp4", file.name, Math.min(1, duration / 2));
      if (blob) {
        const tp = `thumbs/${crypto.randomUUID()}.jpg`;
        const { error: thErr } = await supabase.storage.from("library").upload(tp, blob, { contentType: "image/jpeg" });
        if (!thErr) thumbPath = tp;
      }
      return { ok: { filePath: original, thumbPath, fileName: file.name, fileSize: file.size, mime: file.type || "video/mp4", duration } };
    }
  }
  await supabase.storage.from("library").remove([original]);
  return { error: conv.error ?? "Compression impossible." };
}

export async function discardUpload(u: UploadedVideo) {
  const paths = [u.filePath, u.thumbPath].filter((p): p is string => !!p);
  if (paths.length) await createClient().storage.from("library").remove(paths);
}
