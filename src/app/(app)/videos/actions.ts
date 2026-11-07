"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { parseTags, parseTimecode } from "@/lib/library";
import { VIDEO_EDIT_ROLES } from "@/lib/videos";
import { PHASES, resultOk } from "@/lib/clip-tags";
import { parseShapes } from "@/lib/drawings";
import type { Json } from "@/types/database";

type Result = { error?: string; success?: boolean };

async function guard() {
  const profile = await requireProfile();
  if (!VIDEO_EDIT_ROLES.includes(profile.role))
    return { profile, error: "Action réservée à l'équipe encadrante." };
  return { profile, error: null };
}

function readClip(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const start = parseTimecode(String(formData.get("start") ?? "")) ?? 0;
  const end = parseTimecode(String(formData.get("end") ?? ""));
  if (!title) return { error: "Le titre est requis." as const };
  if (end !== null && end <= start)
    return { error: "La fin du clip doit être après le début." as const };
  return {
    value: {
      title,
      start_seconds: start,
      end_seconds: end,
      note: String(formData.get("note") ?? "").trim().slice(0, 1000) || null,
      tags: parseTags(String(formData.get("tags") ?? "")),
      player_id: String(formData.get("player_id") ?? "") || null,
      system_id: String(formData.get("system_id") ?? "") || null,
    },
  };
}

export async function createClip(formData: FormData): Promise<Result> {
  const { profile, error } = await guard();
  if (error) return { error };
  const sourceId = String(formData.get("source_id") ?? "");
  if (!sourceId) return { error: "Choisis une vidéo source." };
  const parsed = readClip(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("video_clips")
    .insert({ ...parsed.value, source_id: sourceId, created_by: profile.id });
  if (dbError) return { error: dbError.message };
  revalidatePath("/videos");
  return { success: true };
}

export async function updateClip(
  clipId: string,
  formData: FormData,
): Promise<Result> {
  const { error } = await guard();
  if (error) return { error };
  const parsed = readClip(formData);
  if ("error" in parsed) return { error: parsed.error };
  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("video_clips")
    .update(parsed.value)
    .eq("id", clipId);
  if (dbError) return { error: dbError.message };
  revalidatePath("/videos");
  return { success: true };
}

export async function deleteClip(clipId: string): Promise<Result> {
  const { error } = await guard();
  if (error) return { error };
  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("video_clips")
    .delete()
    .eq("id", clipId);
  if (dbError) return { error: dbError.message };
  revalidatePath("/videos");
  return { success: true };
}

export async function createMontage(formData: FormData) {
  const { profile, error } = await guard();
  if (error) throw new Error(error);
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  if (!title) throw new Error("Le titre est requis.");
  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("montages")
    .insert({ title, created_by: profile.id })
    .select("id")
    .single();
  if (dbError) throw new Error(dbError.message);
  revalidatePath("/videos");
  redirect(`/videos?montage=${data.id}`);
}

export async function saveMontage(
  montageId: string,
  input: { title: string; description: string; clipIds: string[] },
): Promise<Result> {
  const { error } = await guard();
  if (error) return { error };
  const title = input.title.trim().slice(0, 200);
  if (!title) return { error: "Le titre est requis." };

  const supabase = await createClient();
  const { error: upErr } = await supabase
    .from("montages")
    .update({
      title,
      description: input.description.trim().slice(0, 1000) || null,
    })
    .eq("id", montageId);
  if (upErr) return { error: upErr.message };

  // Remplace la liste ordonnée : on insère la nouvelle avant de supprimer l'ancienne.
  const { data: old } = await supabase
    .from("montage_clips")
    .select("id")
    .eq("montage_id", montageId);
  if (input.clipIds.length > 0) {
    const { error: insErr } = await supabase.from("montage_clips").insert(
      input.clipIds.map((clip_id, position) => ({
        montage_id: montageId,
        clip_id,
        position,
      })),
    );
    if (insErr) return { error: insErr.message };
  }
  const oldIds = (old ?? []).map((r) => r.id);
  if (oldIds.length > 0)
    await supabase.from("montage_clips").delete().in("id", oldIds);

  revalidatePath("/videos");
  return { success: true };
}

export async function deleteMontage(montageId: string) {
  const { error } = await guard();
  if (error) throw new Error(error);
  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("montages")
    .delete()
    .eq("id", montageId);
  if (dbError) throw new Error(dbError.message);
  revalidatePath("/videos");
  redirect("/videos?vue=montages");
}

/* ---------- Éditeur (repris de PIVOT) ---------- */

export type ClipInput = {
  id?: string;
  sourceId: string;
  title: string;
  start: number;
  end: number;
  phase: string;
  result: string | null;
  playerIds: string[];
  systemId: string | null;
  systemStep: number;
  tags: string;
  shared: boolean;
  comments: { t: number; text: string }[];
};

export async function saveClip(
  input: ClipInput,
): Promise<{ error?: string; id?: string }> {
  const { profile, error } = await guard();
  if (error) return { error };
  if (!Number.isFinite(input.start) || !Number.isFinite(input.end))
    return { error: "Début ou fin invalide." };
  if (input.end <= input.start)
    return { error: "La fin du clip doit être après le début." };
  if (!PHASES.some((p) => p.id === input.phase))
    return { error: "Phase de jeu inconnue." };
  if (!resultOk(input.phase, input.result))
    return { error: "Ce résultat n'existe pas pour cette phase." };

  const fields = {
    title: input.title.trim().slice(0, 200) || "Clip",
    start_seconds: Math.max(0, Math.round(input.start * 100) / 100),
    end_seconds: Math.round(input.end * 100) / 100,
    phase: input.phase,
    result: input.result || null,
    player_ids: input.playerIds.slice(0, 30),
    system_id: input.systemId || null,
    system_step: Math.max(0, Math.round(input.systemStep || 0)),
    tags: parseTags(input.tags),
    shared: !!input.shared,
    comments: input.comments
      .filter((c) => c.text.trim())
      .slice(0, 50)
      .map((c) => ({ t: Math.max(0, c.t), text: c.text.trim().slice(0, 500) })),
  };
  const supabase = await createClient();
  if (input.id) {
    const { error: dbError } = await supabase
      .from("video_clips")
      .update(fields)
      .eq("id", input.id);
    if (dbError) return { error: dbError.message };
    revalidatePath("/videos");
    return { id: input.id };
  }
  const { data, error: dbError } = await supabase
    .from("video_clips")
    .insert({ ...fields, source_id: input.sourceId, created_by: profile.id })
    .select("id")
    .single();
  if (dbError || !data) return { error: dbError?.message ?? "Création impossible." };
  revalidatePath("/videos");
  return { id: data.id };
}

export async function addQuarter(
  sourceId: string,
  t: number,
): Promise<{ error?: string; id?: string }> {
  const { error } = await guard();
  if (error) return { error };
  if (!Number.isFinite(t) || t < 0) return { error: "Position invalide." };
  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("video_quarters")
    .insert({ source_id: sourceId, t: Math.round(t * 100) / 100 })
    .select("id")
    .single();
  if (dbError || !data) return { error: dbError?.message ?? "Échec." };
  return { id: data.id };
}

export async function deleteQuarter(id: string): Promise<Result> {
  const { error } = await guard();
  if (error) return { error };
  const supabase = await createClient();
  const { error: dbError } = await supabase.from("video_quarters").delete().eq("id", id);
  if (dbError) return { error: dbError.message };
  return { success: true };
}

export type DrawingInput = {
  id?: string;
  sourceId: string;
  t: number;
  dur: number;
  hold: number;
  shapes: unknown;
};

export async function saveDrawing(input: DrawingInput): Promise<{ error?: string; id?: string }> {
  const { error } = await guard();
  if (error) return { error };
  const shapes = parseShapes(input.shapes);
  if (shapes.length === 0) return { error: "Le dessin est vide." };
  if (!Number.isFinite(input.t) || input.t < 0) return { error: "Position invalide." };
  const row = {
    t: Math.round(input.t * 100) / 100,
    dur: Math.min(120, Math.max(0.5, Math.round((Number(input.dur) || 2) * 100) / 100)),
    hold: [-1, 0, 2, 3, 5, 8].includes(input.hold) ? input.hold : 3,
    shapes: shapes as unknown as Json,
  };
  const supabase = await createClient();
  if (input.id) {
    const { error: dbError } = await supabase.from("video_drawings").update(row).eq("id", input.id);
    if (dbError) return { error: dbError.message };
    return { id: input.id };
  }
  const { data, error: dbError } = await supabase
    .from("video_drawings")
    .insert({ ...row, source_id: input.sourceId })
    .select("id")
    .single();
  if (dbError || !data) return { error: dbError?.message ?? "Échec." };
  return { id: data.id };
}

export async function deleteDrawing(id: string): Promise<Result> {
  const { error } = await guard();
  if (error) return { error };
  const supabase = await createClient();
  const { error: dbError } = await supabase.from("video_drawings").delete().eq("id", id);
  if (dbError) return { error: dbError.message };
  return {};
}
