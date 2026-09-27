import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { VideoList } from "@/components/video-list";
import { addVideo, deleteVideo } from "./actions";

const SKILL_CATEGORY_LABELS: Record<string, string> = {
  tir: "Tir",
  dribble: "Dribble",
  finition: "Finition",
  passe: "Passe",
  defense: "Défense",
  rebond: "Rebond",
  tactique: "Tactique",
  physique: "Physique",
  mental: "Mental",
};

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ player_id?: string; skill_category?: string }>;
}) {
  const profile = await requireProfile();
  const { player_id, skill_category } = await searchParams;
  const supabase = await createClient();

  const canManage = ["admin", "directeur_sportif", "coach"].includes(profile.role);

  let query = supabase
    .from("videos")
    .select("id, title, video_url, skill_category, duration_seconds, comment, created_at, players(id, first_name, last_name)")
    .order("created_at", { ascending: false });

  if (player_id) query = query.eq("player_id", player_id);
  if (skill_category) query = query.eq("skill_category", skill_category);

  const [{ data: videos }, { data: players }] = await Promise.all([
    query,
    supabase.from("players").select("id, first_name, last_name").order("last_name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-2xl font-bold">Vidéos</h1>
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>
          Clips liés aux joueurs, classés par compétence.
        </p>
      </div>

      <div className="card">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div>
            <label className="mb-1 block text-xs" style={{ color: "var(--text-faint)" }}>Joueur</label>
            <select className="input" name="player_id" defaultValue={player_id ?? ""}>
              <option value="">Tous les joueurs</option>
              {players?.map((p) => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs" style={{ color: "var(--text-faint)" }}>Compétence</label>
            <select className="input" name="skill_category" defaultValue={skill_category ?? ""}>
              <option value="">Toutes</option>
              {Object.entries(SKILL_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <button className="btn-secondary" type="submit">Filtrer</button>
          {(player_id || skill_category) && (
            <Link href="/videos" className="text-xs" style={{ color: "var(--text-faint)" }}>Réinitialiser</Link>
          )}
        </form>
      </div>

      <VideoList
        videos={videos ?? []}
        players={players ?? []}
        canManage={canManage}
        addAction={addVideo}
        deleteAction={deleteVideo}
      />
    </div>
  );
}
