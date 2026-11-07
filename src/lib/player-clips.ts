import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { PlayerClip } from "@/components/player-video";

export type PlayerClipRow = PlayerClip & { playerIds: string[] };

/** Clips rattachés à un joueur ou à une séance, avec miniatures signées. */
export async function loadPlayerClips(
  supabase: SupabaseClient<Database>,
  filter: { trainingId: string } | { playerId: string },
): Promise<PlayerClipRow[]> {
  let q = supabase
    .from("video_clips")
    .select("id, title, note, created_at, player_ids, source_id, training_id, library_items:source_id(thumbnail_path), trainings:training_id(date)")
    .order("created_at", { ascending: false })
    .limit(100);
  q = "trainingId" in filter ? q.eq("training_id", filter.trainingId) : q.contains("player_ids", [filter.playerId]);
  const { data } = await q;
  const rows = data ?? [];

  const thumbs = rows
    .map((r) => (r.library_items as { thumbnail_path: string | null } | null)?.thumbnail_path)
    .filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (thumbs.length) {
    const { data: s } = await supabase.storage.from("library").createSignedUrls(thumbs, 3600);
    s?.forEach((x) => x.path && x.signedUrl && signed.set(x.path, x.signedUrl));
  }
  return rows.map((r) => {
    const tp = (r.library_items as { thumbnail_path: string | null } | null)?.thumbnail_path ?? null;
    const t = r.trainings as { date: string } | null;
    return {
      id: r.id,
      sourceId: r.source_id,
      title: r.title,
      note: r.note,
      thumbUrl: tp ? (signed.get(tp) ?? null) : null,
      createdAt: r.created_at,
      trainingLabel: t ? new Date(t.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : null,
      playerIds: r.player_ids ?? [],
    };
  });
}
