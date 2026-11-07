"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { VIDEO_EDIT_ROLES } from "@/lib/videos";

export type PlayerVideoInput = {
  playerId: string;
  trainingId: string | null;
  title: string;
  note: string;
  filePath: string;
  thumbPath: string | null;
  fileName: string;
  fileSize: number;
  mime: string;
  duration: number;
};

const UUID = /^[0-9a-f-]{36}$/;

/** Crée la vidéo dans la bibliothèque + un clip entier rattaché au joueur (et à la séance). */
export async function addPlayerVideo(
  input: PlayerVideoInput,
): Promise<{ error?: string; clipId?: string; sourceId?: string }> {
  const profile = await requireProfile();
  if (!VIDEO_EDIT_ROLES.includes(profile.role)) return { error: "Action réservée à l'équipe encadrante." };
  if (!UUID.test(input.playerId) || (input.trainingId && !UUID.test(input.trainingId)))
    return { error: "Joueur ou séance invalide." };
  if (/\.\.|^\//.test(input.filePath) || (input.thumbPath && !/^thumbs\/[\w.-]+\.jpg$/.test(input.thumbPath)))
    return { error: "Chemin de fichier invalide." };
  if (input.fileSize > 50 * 1024 * 1024) return { error: "Fichier trop lourd (50 Mo max)." };
  if (!(input.duration > 0)) return { error: "Durée de la vidéo invalide." };

  const supabase = await createClient();
  const { data: player } = await supabase
    .from("players")
    .select("id, first_name, last_name")
    .eq("id", input.playerId)
    .maybeSingle();
  if (!player) return { error: "Joueur introuvable." };

  const title = input.title.trim().slice(0, 200) || `${player.first_name} ${player.last_name} · exercice`;
  const { data: item, error: itemErr } = await supabase
    .from("library_items")
    .insert({
      kind: "video",
      title,
      tags: ["joueur"],
      file_path: input.filePath,
      file_name: input.fileName.slice(0, 255),
      file_size: input.fileSize,
      mime_type: input.mime.slice(0, 120),
      thumbnail_path: input.thumbPath,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (itemErr || !item) return { error: itemErr?.message ?? "Enregistrement impossible." };

  const { data: clip, error: clipErr } = await supabase
    .from("video_clips")
    .insert({
      source_id: item.id,
      title,
      start_seconds: 0,
      end_seconds: Math.round(input.duration * 100) / 100,
      phase: "oth",
      note: input.note.trim().slice(0, 2000) || null,
      player_id: input.playerId,
      player_ids: [input.playerId],
      training_id: input.trainingId,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (clipErr || !clip) {
    await supabase.from("library_items").delete().eq("id", item.id);
    return { error: clipErr?.message ?? "Création du clip impossible." };
  }

  revalidatePath(`/joueurs/${input.playerId}`);
  if (input.trainingId) revalidatePath(`/seances/${input.trainingId}`);
  return { clipId: clip.id, sourceId: item.id };
}

/** Supprime le clip ; la vidéo associée aussi si elle n'a servi qu'à ce clip. */
export async function deletePlayerVideo(clipId: string): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (!VIDEO_EDIT_ROLES.includes(profile.role)) return { error: "Action réservée à l'équipe encadrante." };
  const supabase = await createClient();
  const { data: clip } = await supabase
    .from("video_clips")
    .select("id, source_id, player_id, training_id")
    .eq("id", clipId)
    .maybeSingle();
  if (!clip) return {};
  const { error } = await supabase.from("video_clips").delete().eq("id", clipId);
  if (error) return { error: error.message };

  const { count } = await supabase
    .from("video_clips")
    .select("id", { count: "exact", head: true })
    .eq("source_id", clip.source_id);
  if (!count) {
    const { data: item } = await supabase
      .from("library_items")
      .select("id, file_path, thumbnail_path, tags")
      .eq("id", clip.source_id)
      .maybeSingle();
    if (item && item.tags?.includes("joueur")) {
      const paths = [item.file_path, item.thumbnail_path].filter((p): p is string => !!p);
      if (paths.length) await supabase.storage.from("library").remove(paths);
      await supabase.from("library_items").delete().eq("id", item.id);
    }
  }
  if (clip.player_id) revalidatePath(`/joueurs/${clip.player_id}`);
  if (clip.training_id) revalidatePath(`/seances/${clip.training_id}`);
  return {};
}
