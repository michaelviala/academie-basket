import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { youtubeId, videoSource } from "@/lib/library";
import {
  VIDEO_EDIT_ROLES,
  formatDuration,
  totalDuration,
  type ClipView,
  type VideoSourceInfo,
} from "@/lib/videos";
import { ClipsBrowser } from "@/components/clips-browser";
import { MontageEditor } from "@/components/montage-editor";
import { createMontage } from "./actions";

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; montage?: string }>;
}) {
  const { vue, montage: montageId } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  const isStaff = [...VIDEO_EDIT_ROLES, "preparateur_physique"].includes(profile.role);
  if (!isStaff) notFound();
  const canEdit = VIDEO_EDIT_ROLES.includes(profile.role);
  const isDirection = ["admin", "directeur_sportif"].includes(profile.role);

  const [{ data: items }, { data: clipRows }, { data: players }, { data: montages }, { data: mcRows }] =
    await Promise.all([
      supabase
        .from("library_items")
        .select("id, title, file_path, thumbnail_path, video_url")
        .eq("kind", "video")
        .order("created_at", { ascending: false }),
      supabase
        .from("video_clips")
        .select("id, title, source_id, start_seconds, end_seconds, note, tags, player_id, created_by, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("players").select("id, first_name, last_name").order("last_name"),
      supabase.from("montages").select("id, title, description, created_by, created_at").order("created_at", { ascending: false }),
      supabase.from("montage_clips").select("montage_id, clip_id, position").order("position"),
    ]);

  const paths = (items ?? [])
    .flatMap((r) => [r.file_path, r.thumbnail_path])
    .filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data } = await supabase.storage.from("library").createSignedUrls(paths, 3600);
    data?.forEach((s) => {
      if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
    });
  }

  const sources: VideoSourceInfo[] = (items ?? []).map((r) => {
    const yt = youtubeId(r.video_url);
    const direct = r.video_url ? videoSource(r.video_url, null, null) : null;
    const url = r.file_path ? (signed.get(r.file_path) ?? null) : r.video_url;
    const kind: VideoSourceInfo["kind"] = r.file_path
      ? "file"
      : yt
        ? "youtube"
        : direct?.type === "file"
          ? "file"
          : "other";
    return {
      id: r.id,
      title: r.title,
      kind,
      url,
      ytId: yt,
      thumbUrl: r.thumbnail_path
        ? (signed.get(r.thumbnail_path) ?? null)
        : yt
          ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`
          : null,
    };
  });
  const sourceMap = new Map(sources.map((s) => [s.id, s]));
  const playerMap = new Map(
    (players ?? []).map((p) => [p.id, `${p.first_name} ${p.last_name}`]),
  );

  const clips: ClipView[] = (clipRows ?? []).flatMap((c) => {
    const source = sourceMap.get(c.source_id);
    if (!source) return [];
    return [
      {
        id: c.id,
        title: c.title,
        start: c.start_seconds,
        end: c.end_seconds,
        note: c.note,
        tags: c.tags ?? [],
        playerId: c.player_id,
        playerName: c.player_id ? (playerMap.get(c.player_id) ?? null) : null,
        source,
        canEdit: isDirection || c.created_by === profile.id,
      },
    ];
  });
  const clipMap = new Map(clips.map((c) => [c.id, c]));

  const montageClips = new Map<string, string[]>();
  for (const r of mcRows ?? [])
    (montageClips.get(r.montage_id) ?? montageClips.set(r.montage_id, []).get(r.montage_id)!).push(r.clip_id);

  /* ---------- détail d'un montage ---------- */
  if (montageId) {
    const m = (montages ?? []).find((x) => x.id === montageId);
    if (!m) notFound();
    return (
      <div className="space-y-4">
        <Link href="/videos?vue=montages" className="text-xs" style={{ color: "var(--text-faint)" }}>
          ← Tous les montages
        </Link>
        <h1 className="display text-2xl font-bold sm:text-3xl">{m.title}</h1>
        <MontageEditor
          key={m.id}
          montage={{
            id: m.id,
            title: m.title,
            description: m.description,
            clipIds: montageClips.get(m.id) ?? [],
          }}
          clips={clips}
          canEdit={canEdit && (isDirection || m.created_by === profile.id)}
        />
      </div>
    );
  }

  const tab = vue === "montages" ? "montages" : "clips";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-2xl font-bold sm:text-3xl">Vidéos</h1>
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>
          Découpe les vidéos de la bibliothèque en clips, puis assemble-les en montages.
        </p>
      </div>

      <div className="seg">
        <Link href="/videos" className={tab === "clips" ? "active" : ""}>
          Clips ({clips.length})
        </Link>
        <Link href="/videos?vue=montages" className={tab === "montages" ? "active" : ""}>
          Montages ({montages?.length ?? 0})
        </Link>
      </div>

      {tab === "clips" ? (
        <ClipsBrowser
          clips={clips}
          sources={sources.filter((s) => s.kind !== "other")}
          players={players ?? []}
          canEdit={canEdit}
        />
      ) : (
        <div className="space-y-4">
          {canEdit && (
            <form action={createMontage} className="flex flex-wrap gap-2">
              <input className="input min-w-0 flex-1 sm:max-w-sm" name="title" placeholder="Titre du nouveau montage" required maxLength={200} />
              <button className="btn-primary">+ Nouveau montage</button>
            </form>
          )}
          {(montages ?? []).length === 0 ? (
            <div className="empty">Aucun montage. Crée-en un puis ajoute-y des clips.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(montages ?? []).map((m) => {
                const list = (montageClips.get(m.id) ?? [])
                  .map((id) => clipMap.get(id))
                  .filter((c): c is ClipView => !!c);
                const t = totalDuration(list);
                const thumb = list[0]?.source.thumbUrl;
                return (
                  <Link key={m.id} href={`/videos?montage=${m.id}`} className="card block min-w-0 !p-3">
                    <div className="relative overflow-hidden rounded-lg bg-black" style={{ aspectRatio: "16 / 9" }}>
                      {thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="h-full w-full object-cover opacity-70" />
                      )}
                      <span className="absolute inset-0 flex items-center justify-center text-4xl text-white">▶</span>
                    </div>
                    <p className="mt-2 truncate font-semibold">{m.title}</p>
                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                      {list.length} clip{list.length > 1 ? "s" : ""}
                      {list.length > 0 && ` · ${t.complete ? "" : "≥ "}${formatDuration(t.seconds)}`}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
