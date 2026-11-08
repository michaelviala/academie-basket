"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import {
  LIBRARY_EDIT_ROLES,
  MAX_FILE_BYTES,
  parseTags,
  parseTimecode,
} from "@/lib/library";

type Result = { error?: string; success?: boolean };

/**
 * Enregistre une entrée de la bibliothèque. Le fichier a déjà été envoyé par le navigateur
 * directement dans le stockage (les fichiers dépassent la limite d'envoi des actions serveur).
 */
export async function addLibraryItem(formData: FormData): Promise<Result> {
  const profile = await requireProfile();
  if (!LIBRARY_EDIT_ROLES.includes(profile.role))
    return { error: "Action réservée à l'équipe encadrante." };

  const kind = formData.get("kind") === "video" ? "video" : "document";
  const title = String(formData.get("title") ?? "")
    .trim()
    .slice(0, 200);
  if (!title) return { error: "Le titre est requis." };

  const filePath = String(formData.get("file_path") ?? "") || null;
  if (filePath && (filePath.includes("..") || filePath.startsWith("/")))
    return { error: "Chemin de fichier invalide." };
  const fileSize = Number(formData.get("file_size") ?? 0) || null;
  if (fileSize && fileSize > MAX_FILE_BYTES)
    return { error: "Fichier trop lourd (50 Mo max)." };

  let videoUrl = String(formData.get("video_url") ?? "").trim() || null;
  if (videoUrl) {
    try {
      const u = new URL(videoUrl);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error();
    } catch {
      return { error: "Le lien de la vidéo n'est pas valide (https://…)." };
    }
  }
  if (kind === "document" && !filePath)
    return { error: "Choisis un fichier à ajouter." };
  if (kind === "video" && !filePath && !videoUrl)
    return { error: "Ajoute un fichier vidéo ou un lien." };

  const thumbRaw = String(formData.get("thumbnail_path") ?? "");
  const thumbPath = /^thumbs\/[\w.-]+\.jpg$/.test(thumbRaw) ? thumbRaw : null;

  const start = parseTimecode(String(formData.get("start") ?? ""));
  const end = parseTimecode(String(formData.get("end") ?? ""));
  if (start !== null && end !== null && end <= start)
    return { error: "La fin de la séquence doit être après le début." };
  if (filePath) videoUrl = null;

  const supabase = await createClient();
  const { error } = await supabase.from("library_items").insert({
    kind,
    title,
    description:
      String(formData.get("description") ?? "")
        .trim()
        .slice(0, 2000) || null,
    tags: parseTags(String(formData.get("tags") ?? "")),
    file_path: filePath,
    file_name: String(formData.get("file_name") ?? "").slice(0, 255) || null,
    file_size: fileSize,
    mime_type: String(formData.get("mime_type") ?? "").slice(0, 120) || null,
    video_url: videoUrl,
    thumbnail_path: thumbPath,
    start_seconds: kind === "video" ? start : null,
    end_seconds: kind === "video" ? end : null,
    created_by: profile.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/bibliotheque");
  return { success: true };
}

/** Enregistre la vignette générée par le navigateur (auteur ou direction). */
export async function setLibraryThumbnail(
  itemId: string,
  path: string,
): Promise<Result> {
  const profile = await requireProfile();
  if (!LIBRARY_EDIT_ROLES.includes(profile.role))
    return { error: "Action réservée à l'équipe encadrante." };
  if (!/^thumbs\/[\w.-]+\.jpg$/.test(path))
    return { error: "Chemin invalide." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library_items")
    .update({ thumbnail_path: path })
    .eq("id", itemId)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "Modification refusée." };
  return { success: true };
}

export async function updateLibraryTags(
  itemId: string,
  rawTags: string,
): Promise<Result> {
  const profile = await requireProfile();
  if (!LIBRARY_EDIT_ROLES.includes(profile.role))
    return { error: "Action réservée à l'équipe encadrante." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library_items")
    .update({ tags: parseTags(rawTags) })
    .eq("id", itemId)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return {
      error:
        "Modification refusée (seul l'auteur ou la direction peut modifier).",
    };
  revalidatePath("/bibliotheque");
  return { success: true };
}

export async function deleteLibraryItem(itemId: string): Promise<Result> {
  const profile = await requireProfile();
  if (!LIBRARY_EDIT_ROLES.includes(profile.role))
    return { error: "Action réservée à l'équipe encadrante." };
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("library_items")
    .select("file_path")
    .eq("id", itemId)
    .maybeSingle();
  const { data, error } = await supabase
    .from("library_items")
    .delete()
    .eq("id", itemId)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return {
      error:
        "Suppression refusée (seul l'auteur ou la direction peut supprimer).",
    };
  if (item?.file_path)
    await supabase.storage.from("library").remove([item.file_path]);
  revalidatePath("/bibliotheque");
  return { success: true };
}

/** Ajoute ou retire une ressource des favoris de l'utilisateur connecté (favoris personnels). */
export async function setLibraryFavorite(
  itemId: string,
  favorite: boolean,
): Promise<Result> {
  const profile = await requireProfile();
  const supabase = await createClient();
  if (favorite) {
    const { error } = await supabase
      .from("library_favorites")
      .insert({ user_id: profile.id, item_id: itemId });
    // 23505 : déjà en favori, rien à faire
    if (error && error.code !== "23505")
      return { error: "Impossible d'ajouter aux favoris." };
  } else {
    const { error } = await supabase
      .from("library_favorites")
      .delete()
      .eq("user_id", profile.id)
      .eq("item_id", itemId);
    if (error) return { error: "Impossible de retirer des favoris." };
  }
  revalidatePath("/bibliotheque");
  return { success: true };
}

/** Marque ou démarque un document « à connaître » pour tout le staff (direction uniquement). */
export async function setLibraryEssential(
  itemId: string,
  essential: boolean,
): Promise<Result> {
  const profile = await requireProfile();
  if (!["admin", "directeur_sportif"].includes(profile.role))
    return { error: "Réservé à la direction." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library_items")
    .update({ essential })
    .eq("id", itemId)
    .select("id");
  if (error) return { error: "Modification impossible." };
  if (!data || data.length === 0) return { error: "Modification refusée." };
  revalidatePath("/bibliotheque");
  return { success: true };
}
