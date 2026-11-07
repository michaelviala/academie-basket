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
  type VideoRow,
} from "@/lib/videos";
import { ClipsBrowser } from "@/components/clips-browser";
import { MontageEditor } from "@/components/montage-editor";
import { VideoLibrary } from "@/components/video-library";
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

  const [{ data: items }, { data: clipRows }, { data: players }, { data: systemsList }, { data: montages }, { data: mcRows }] =
    await Promise.all([
      supabase
        .from("library_items")
        .select("id, title, file_path, thumbnail_path, video_url, created_at, created_by")
        .eq("kind", "video")
        .order("created_at", { ascending: false }),
      supabase
        .from("video_clips")
        .select("id, title, source_id, start_seconds, end_seconds, note, tags, player_id, player_ids, training_id, system_id, created_by, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("players").select("id, first_name, last_name").order("last_name"),
      supabase.from("systems").select("id, name").order("name"),
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
        systemId: c.system_id,
        playerName: c.player_id ? (playerMap.get(c.player_id) ?? null) : null,
        source,
        canEdit: isDirection || c.created_by === profile.id,
      },
    ];
  });
  const clipMap = new Map(clips.map((c) => [c.id, c]));

  /* ---------- liste générale : joueur / séance / coach de chaque vidéo ---------- */
  const trainingIds = [...new Set((clipRows ?? []).flatMap((c) => (c.training_id ? [c.training_id] : [])))];
  const coachIds = [...new Set((items ?? []).flatMap((r) => (r.created_by ? [r.created_by] : [])))];
  const [{ data: trainingRows }, { data: coachRows }] = await Promise.all([
    trainingIds.length
      ? supabase.from("trainings").select("id, date, teams:team_id(name)").in("id", trainingIds)
      : Promise.resolve({ data: [] as { id: string; date: string; teams: { name: string } | null }[] }),
    coachIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", coachIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);
  const trainingLabel = new Map(
    (trainingRows ?? []).map((t) => {
      const team = (t.teams as { name: string } | null)?.name;
      const d = new Date(t.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
      return [t.id, team ? `${d} · ${team}` : d] as const;
    }),
  );
  const coachName = new Map((coachRows ?? []).map((c) => [c.id, c.full_name]));
  const rows: VideoRow[] = (items ?? []).map((r) => {
    const mine = (clipRows ?? []).filter((c) => c.source_id === r.id);
    const pl = new Map<string, string>();
    const tr = new Map<string, string>();
    for (const c of mine) {
      for (const id of new Set([...(c.player_ids ?? []), ...(c.player_id ? [c.player_id] : [])])) {
        const n = playerMap.get(id);
        if (n) pl.set(id, n);
      }
      if (c.training_id && trainingLabel.has(c.training_id)) tr.set(c.training_id, trainingLabel.get(c.training_id)!);
    }
    return {
      source: sourceMap.get(r.id)!,
      createdAt: r.created_at,
      coachId: r.created_by,
      coachName: r.created_by ? (coachName.get(r.created_by) ?? null) : null,
      players: [...pl].map(([id, name]) => ({ id, name })),
      trainings: [...tr].map(([id, label]) => ({ id, label })),
      clipCount: mine.length,
      firstClipId: mine.length === 1 ? mine[0].id : null,
    };
  });

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

  const tab = vue === "montages" ? "montages" : vue === "clips" ? "clips" : "videos";
  const inMontage = tab !== "videos";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-2xl font-bold sm:text-3xl">Vidéos</h1>
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>
          {inMontage
            ? "Découpe une vidéo en clips (avec dessins et commentaires), puis assemble les clips en montages."
            : "Toutes les vidéos du club : filtre par joueur, séance ou coach."}
        </p>
      </div>

      <div className="seg">
        <Link href="/videos" className={!inMontage ? "active" : ""}>
          Toutes les vidéos ({sources.length})
        </Link>
        <Link href="/videos?vue=clips" className={inMontage ? "active" : ""}>
          ✂ Montage &amp; analyse
        </Link>
      </div>
      {inMontage && (
        <div className="seg">
          <Link href="/videos?vue=clips" className={tab === "clips" ? "active" : ""}>
            Clips ({clips.length})
          </Link>
          <Link href="/videos?vue=montages" className={tab === "montages" ? "active" : ""}>
            Montages ({montages?.length ?? 0})
          </Link>
        </div>
      )}

      {tab === "videos" ? (
        <VideoLibrary rows={rows} canEdit={canEdit} />
      ) : tab === "clips" ? (
        <ClipsBrowser
          clips={clips}
          sources={sources.filter((s) => s.kind !== "other")}
          players={players ?? []}
          systems={systemsList ?? []}
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
