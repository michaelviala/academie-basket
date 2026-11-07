import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { VIDEO_EDIT_ROLES } from "@/lib/videos";
import { ffmpegAvailable, probe, thumbnail, toH264 } from "@/lib/ffmpeg";

export const runtime = "nodejs";

const SRC = /^[0-9a-f-]{36}\/[\w.\-]{1,120}$/;
const MAX_SECONDS = 180;

// une seule compression à la fois : le serveur est petit
let chain: Promise<unknown> = Promise.resolve();
let waiting = 0;
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  waiting++;
  const next = chain.then(fn, fn).finally(() => {
    waiting--;
  });
  chain = next.catch(() => {});
  return next;
}

type Done = { filePath: string; thumbPath: string | null; duration: number; size: number };

async function convert(supabase: Awaited<ReturnType<typeof createClient>>, path: string, maxSeconds: number): Promise<{ ok: Done } | { error: string; code?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Non connecté." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
  if (!profile || !VIDEO_EDIT_ROLES.includes(profile.role)) return { error: "Action réservée à l'équipe encadrante." };
  if (!SRC.test(path)) return { error: "Chemin invalide." };
  if (!(await ffmpegAvailable())) return { error: "Compression indisponible sur ce serveur.", code: "no_ffmpeg" };

  const dir = await mkdtemp(join(tmpdir(), "conv-"));
  try {
    const { data: blob, error: dlErr } = await supabase.storage.from("library").download(path);
    if (dlErr || !blob) return { error: `Fichier introuvable : ${dlErr?.message ?? ""}` };
    const input = join(dir, "in.bin");
    await writeFile(input, Buffer.from(await blob.arrayBuffer()));

    const info = await probe(input);
    if (!info) return { error: "Cette vidéo est illisible (format non reconnu)." };
    if (info.duration > maxSeconds + 0.7) return { error: `Vidéo trop longue (${Math.round(info.duration)} s, ${maxSeconds} s max) : filme plus court.` };

    const out = join(dir, "out.mp4");
    await toH264(input, out, info.hdr);
    const thumbFile = join(dir, "t.jpg");
    const hasThumb = await thumbnail(out, thumbFile, Math.min(1, info.duration / 2));

    const filePath = `${randomUUID()}/video.mp4`;
    const bytes = await readFile(out);
    const { error: upErr } = await supabase.storage.from("library").upload(filePath, bytes, { contentType: "video/mp4" });
    if (upErr) return { error: `Enregistrement impossible : ${upErr.message}` };

    let thumbPath: string | null = null;
    if (hasThumb) {
      const tp = `thumbs/${randomUUID()}.jpg`;
      const { error: tErr } = await supabase.storage.from("library").upload(tp, await readFile(thumbFile), { contentType: "image/jpeg" });
      if (!tErr) thumbPath = tp;
    }
    await supabase.storage.from("library").remove([path]); // l'original lourd n'est plus utile
    return { ok: { filePath, thumbPath, duration: Math.round(info.duration * 100) / 100, size: bytes.length } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Compression impossible." };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Réponse en flux : des espaces toutes les 10 s empêchent le proxy de couper une compression longue. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { path?: string; maxSeconds?: number } | null;
  const path = body?.path ?? "";
  const asked = Number(body?.maxSeconds);
  const maxSeconds = Number.isFinite(asked) && asked > 0 ? Math.min(asked, MAX_SECONDS) : MAX_SECONDS;
  if (waiting >= 3) return Response.json({ error: "Plusieurs compressions en cours : réessaie dans une minute." }, { status: 429 });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const beat = setInterval(() => controller.enqueue(enc.encode(" ")), 10000);
      try {
        const supabase = await createClient();
        const res = await exclusive(() => convert(supabase, path, maxSeconds));
        controller.enqueue(enc.encode(JSON.stringify(res)));
      } catch (e) {
        controller.enqueue(enc.encode(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur." })));
      } finally {
        clearInterval(beat);
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
