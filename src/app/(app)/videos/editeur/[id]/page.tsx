import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { videoSource, youtubeId } from "@/lib/library";
import { VIDEO_EDIT_ROLES, buildSource } from "@/lib/videos";
import { parseComments } from "@/lib/clip-tags";
import { parseShapes } from "@/lib/drawings";
import { VideoEditor, type EditorClip } from "@/components/video-editor";

export default async function EditeurPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ clip?: string }>;
}) {
  const { id } = await params;
  const { clip } = await searchParams;
  const profile = await requireProfile();
  if (![...VIDEO_EDIT_ROLES, "preparateur_physique"].includes(profile.role)) notFound();
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("library_items")
    .select("id, title, kind, file_path, thumbnail_path, video_url")
    .eq("id", id)
    .eq("kind", "video")
    .maybeSingle();
  if (!item) notFound();

  const paths = [item.file_path].filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data } = await supabase.storage.from("library").createSignedUrls(paths, 3600 * 4);
    data?.forEach((s) => {
      if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
    });
  }
  const source = buildSource(item, signed, {
    youtubeId,
    isDirect: (u) => videoSource(u, null, null)?.type === "file",
  });

  const [{ data: clipRows }, { data: quarters }, { data: drawingRows }, { data: players }, { data: systems }, { data: steps }] =
    await Promise.all([
      supabase.from("video_clips").select("*").eq("source_id", id).order("start_seconds"),
      supabase.from("video_quarters").select("id, t").eq("source_id", id).order("t"),
      supabase.from("video_drawings").select("id, t, dur, hold, shapes").eq("source_id", id).order("t"),
      supabase.from("players").select("id, first_name, last_name").order("last_name"),
      supabase.from("systems").select("id, name").order("name"),
      supabase.from("system_sequences").select("system_id, label, position").order("position"),
    ]);

  const stepsBy = new Map<string, string[]>();
  for (const s of steps ?? []) (stepsBy.get(s.system_id) ?? stepsBy.set(s.system_id, []).get(s.system_id)!).push(s.label);

  const isDirection = ["admin", "directeur_sportif"].includes(profile.role);
  const clips: EditorClip[] = (clipRows ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    start: Number(c.start_seconds),
    end: Number(c.end_seconds ?? c.start_seconds + 10),
    phase: c.phase,
    result: c.result,
    playerIds: c.player_ids ?? [],
    systemId: c.system_id,
    systemStep: c.system_step,
    tags: (c.tags ?? []).join(", "),
    shared: c.shared,
    comments: parseComments(c.comments),
    canDelete: isDirection || c.created_by === profile.id,
  }));

  return (
    <div className="space-y-4">
      <div>
        <Link href="/videos" className="text-xs" style={{ color: "var(--text-faint)" }}>
          ← Vidéos
        </Link>
        <h1 className="display mt-1 text-2xl font-bold sm:text-3xl">{item.title}</h1>
      </div>
      <VideoEditor
        source={source}
        initialClips={clips}
        initialQuarters={(quarters ?? []).map((q) => ({ id: q.id, t: Number(q.t) }))}
        initialDrawings={(drawingRows ?? []).map((d) => ({
          id: d.id,
          t: Number(d.t),
          dur: Number(d.dur),
          hold: Number(d.hold),
          shapes: parseShapes(d.shapes),
        }))}
        players={players ?? []}
        systems={(systems ?? []).map((s) => ({ id: s.id, name: s.name, steps: stepsBy.get(s.id) ?? [] }))}
        canEdit={VIDEO_EDIT_ROLES.includes(profile.role)}
        openClipId={clip ?? null}
      />
    </div>
  );
}
