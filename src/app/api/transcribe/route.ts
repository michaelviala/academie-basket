import { createClient } from "@/lib/supabase/server";
import { VIDEO_EDIT_ROLES } from "@/lib/videos";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

async function staff() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data: p } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
  return !!p && VIDEO_EDIT_ROLES.includes(p.role);
}

const enabled = () => !!process.env.TRANSCRIBE_API_KEY;

/** Dit si la transcription par le serveur est configurée. */
export async function GET() {
  if (!(await staff())) return Response.json({ error: "Non autorisé." }, { status: 401 });
  return Response.json({ enabled: enabled() }, { headers: { "Cache-Control": "no-store" } });
}

/** Transcrit un enregistrement (fr) via un service compatible « OpenAI audio/transcriptions ». */
export async function POST(request: Request) {
  if (!(await staff())) return Response.json({ error: "Non autorisé." }, { status: 401 });
  const key = process.env.TRANSCRIBE_API_KEY;
  if (!key) return Response.json({ error: "Transcription non configurée sur le serveur." }, { status: 501 });

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) return Response.json({ error: "Aucun enregistrement reçu." }, { status: 400 });
  if (audio.size > MAX_BYTES) return Response.json({ error: "Enregistrement trop long : dicte en plusieurs fois." }, { status: 413 });

  const url = process.env.TRANSCRIBE_API_URL || "https://api.openai.com/v1/audio/transcriptions";
  const model = process.env.TRANSCRIBE_MODEL || "whisper-1";
  const ext = audio.type.includes("mp4") ? "m4a" : audio.type.includes("ogg") ? "ogg" : "webm";
  const fd = new FormData();
  fd.set("file", audio, `commentaire.${ext}`);
  fd.set("model", model);
  fd.set("language", "fr");
  fd.set("response_format", "json");
  fd.set("prompt", "Commentaire d'un entraîneur de basket sur un joueur : tir, passe, défense, appuis, rebond.");

  try {
    const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: fd, signal: AbortSignal.timeout(60000) });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 200);
      return Response.json({ error: `Service de transcription : erreur ${res.status}. ${detail}` }, { status: 502 });
    }
    const j = (await res.json()) as { text?: string };
    return Response.json({ text: (j.text ?? "").trim() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Service de transcription injoignable." }, { status: 502 });
  }
}
