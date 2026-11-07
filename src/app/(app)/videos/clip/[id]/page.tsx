import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { videoSource, youtubeId } from "@/lib/library";
import { VIDEO_EDIT_ROLES, buildSource } from "@/lib/videos";
import { parseComments, phaseOf, RESULTS } from "@/lib/clip-tags";
import { parseShapes } from "@/lib/drawings";
import { parsePositions } from "@/lib/systems";
import { ClipViewer } from "@/components/clip-viewer";

export default async function ClipPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ montage?: string; vue?: string }>;
}) {
  const { id } = await params;
  const { montage, vue } = await searchParams;
  const profile = await requireProfile();
  if (![...VIDEO_EDIT_ROLES, "preparateur_physique"].includes(profile.role)) notFound();
  const supabase = await createClient();

  const { data: clip } = await supabase.from("video_clips").select("*").eq("id", id).maybeSingle();
  if (!clip || !clip.source_id) notFound();
  const start = Number(clip.start_seconds);
  const end = Number(clip.end_seconds ?? start + 10);

  const { data: item } = await supabase
    .from("library_items")
    .select("id, title, kind, file_path, thumbnail_path, video_url")
    .eq("id", clip.source_id)
    .eq("kind", "video")
    .maybeSingle();
  if (!item) notFound();

  const comments = parseComments(clip.comments);
  const toSign = [item.file_path, ...comments.map((c) => c.audio)].filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (toSign.length > 0) {
    const { data } = await supabase.storage.from("library").createSignedUrls(toSign, 3600 * 4);
    data?.forEach((s) => {
      if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
    });
  }
  const source = buildSource(item, signed, {
    youtubeId,
    isDirect: (u) => videoSource(u, null, null)?.type === "file",
  });
  const audioUrls: Record<string, string> = {};
  for (const c of comments) if (c.audio && signed.has(c.audio)) audioUrls[c.audio] = signed.get(c.audio)!;

  const [{ data: drawingRows }, { data: sys }, { data: seqRows }, { data: mcRows }] = await Promise.all([
    supabase
      .from("video_drawings")
      .select("id, t, dur, hold, shapes")
      .eq("source_id", clip.source_id)
      .gte("t", start - 0.05)
      .lte("t", end + 0.05)
      .order("t"),
    clip.system_id
      ? supabase.from("systems").select("id, name").eq("id", clip.system_id).maybeSingle()
      : Promise.resolve({ data: null }),
    clip.system_id
      ? supabase.from("system_sequences").select("label, position, positions").eq("system_id", clip.system_id).order("position")
      : Promise.resolve({ data: [] }),
    montage
      ? supabase.from("montage_clips").select("clip_id, position").eq("montage_id", montage).order("position")
      : Promise.resolve({ data: [] }),
  ]);

  let montageNav: { title: string; index: number; total: number; prev: string | null; next: string | null } | null = null;
  if (montage && mcRows && mcRows.length > 0) {
    const ids = mcRows.map((r) => r.clip_id);
    const i = ids.indexOf(id);
    if (i >= 0) {
      const { data: m } = await supabase.from("montages").select("title").eq("id", montage).maybeSingle();
      montageNav = {
        title: m?.title ?? "Montage",
        index: i + 1,
        total: ids.length,
        prev: i > 0 ? `/videos/clip/${ids[i - 1]}?montage=${montage}` : null,
        next: i < ids.length - 1 ? `/videos/clip/${ids[i + 1]}?montage=${montage}` : null,
      };
    }
  }

  const system =
    sys && seqRows && seqRows.length > 0
      ? { id: sys.id, name: sys.name, sequences: seqRows.map((s) => ({ label: s.label, positions: parsePositions(s.positions) })) }
      : null;
  const phase = phaseOf(clip.phase);

  return (
    <div className="space-y-4">
      <div>
        <Link href={montage ? `/videos?vue=montages&montage=${montage}` : "/videos"} className="text-xs" style={{ color: "var(--text-faint)" }}>
          ← {montage ? "Montage" : "Clips"} · {item.title}
        </Link>
        <h1 className="display mt-1 text-2xl font-bold sm:text-3xl">{clip.title}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="badge" style={{ background: phase.color, color: "#000" }}>{phase.label}</span>
          {clip.result && <span className="badge">{RESULTS.find((r) => r.id === clip.result)?.label}</span>}
          {(clip.tags ?? []).map((t: string) => (
            <span key={t} className="badge">#{t}</span>
          ))}
        </div>
      </div>
      <ClipViewer
        clipId={clip.id}
        source={source}
        start={start}
        end={end}
        comments={comments}
        audioUrls={audioUrls}
        drawings={(drawingRows ?? []).map((d) => ({
          id: d.id,
          t: Number(d.t),
          dur: Number(d.dur),
          hold: Number(d.hold),
          shapes: parseShapes(d.shapes),
        }))}
        system={system}
        systemStep={clip.system_step ?? 0}
        compare={vue === "comparer" && !!system}
        nav={montageNav}
        compareHref={`/videos/clip/${clip.id}?${montage ? `montage=${montage}&` : ""}vue=comparer`}
        leaveHref={`/videos/clip/${clip.id}${montage ? `?montage=${montage}` : ""}`}
        editHref={`/videos/editeur/${clip.source_id}?clip=${clip.id}`}
        canEdit={VIDEO_EDIT_ROLES.includes(profile.role)}
      />
    </div>
  );
}
