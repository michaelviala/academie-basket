import { createClient } from "@/lib/supabase/client";
import { makeThumbnail } from "@/lib/library-thumbnail";

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

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

/** Contrôle puis envoie une vidéo dans la bibliothèque. Retourne une erreur lisible sinon. */
export async function uploadVideo(file: File): Promise<{ error: string } | { ok: UploadedVideo }> {
  if (file.size > MAX_VIDEO_BYTES)
    return { error: "Vidéo trop lourde (50 Mo max). Filme plus court ou réduis la qualité." };
  const codec = await sniffCodec(file);
  if (codec === "hevc" || codec === "prores")
    return {
      error:
        "Format vidéo non lisible dans le navigateur (" +
        (codec === "hevc" ? "HEVC / H.265" : "ProRes") +
        "). iPhone : Réglages → Appareil photo → Formats → « Le plus compatible ». Android : désactive la vidéo HEVC. Sinon convertis-la en H.264 (HandBrake).",
    };
  const duration = await videoDuration(file);
  if (!duration || duration <= 0) return { error: "Impossible de lire cette vidéo. Essaie un fichier mp4 (H.264)." };

  const supabase = createClient();
  const safe = file.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.\-]+/g, "_")
    .slice(-80);
  const filePath = `${crypto.randomUUID()}/${safe || "video.mp4"}`;
  const { error } = await supabase.storage
    .from("library")
    .upload(filePath, file, { contentType: file.type || "video/mp4" });
  if (error) return { error: `Envoi impossible : ${error.message}` };

  let thumbPath: string | null = null;
  const blob = await makeThumbnail(file, file.type || "video/mp4", file.name, Math.min(1, duration / 2));
  if (blob) {
    const tp = `thumbs/${crypto.randomUUID()}.jpg`;
    const { error: thErr } = await supabase.storage.from("library").upload(tp, blob, { contentType: "image/jpeg" });
    if (!thErr) thumbPath = tp;
  }
  return { ok: { filePath, thumbPath, fileName: file.name, fileSize: file.size, mime: file.type || "video/mp4", duration } };
}

export async function discardUpload(u: UploadedVideo) {
  const paths = [u.filePath, u.thumbPath].filter((p): p is string => !!p);
  if (paths.length) await createClient().storage.from("library").remove(paths);
}
