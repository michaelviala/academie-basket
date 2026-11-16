"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FOCUSES } from "@/lib/blocks";
import { requireProfile } from "@/lib/data";
import { BLOCK_TYPES, SESSION_EDIT_ROLES, totalMinutes } from "@/lib/sessions";
import { expandDates, validateRecurrence, type Recurrence } from "@/lib/recurrence";

export type SessionPayload = {
  title: string;
  date: string;
  start_time: string;
  team_id: string;
  gym_id: string;
  coach_id: string;
  intensity: string;
  focus?: string;
  /** Périodicité (création seulement) : la séance est dupliquée à chaque date jusqu'à la date de fin. */
  recurrence?: Recurrence;
  blocks: {
    name: string;
    block_type: string;
    duration_minutes: number | null;
    comment: string;
    skill_id: string;
    system_id: string;
  }[];
};

type Result = { error?: string; id?: string; count?: number };

const FOCUS_VALUES: string[] = FOCUSES.map((f) => f.value);
const BLOCK_VALUES: string[] = BLOCK_TYPES.map((b) => b.value);

function validate(p: SessionPayload): string | null {
  if (!p.title.trim()) return "Donne un titre à la séance.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) return "La date est invalide.";
  if (p.start_time && !/^\d{2}:\d{2}$/.test(p.start_time))
    return "L'heure de début est invalide.";
  if (!p.team_id) return "Choisis la catégorie concernée.";
  if (p.blocks.some((b) => !b.name.trim()))
    return "Chaque bloc doit avoir un titre.";
  if (
    p.blocks.some(
      (b) =>
        b.duration_minutes !== null &&
        (!Number.isFinite(b.duration_minutes) ||
          b.duration_minutes < 0 ||
          b.duration_minutes > 600),
    )
  )
    return "Une durée de bloc est invalide.";
  return null;
}

function blockRows(trainingId: string, blocks: SessionPayload["blocks"]) {
  return blocks.map((b, i) => ({
    training_id: trainingId,
    name: b.name.trim().slice(0, 200),
    block_type: BLOCK_VALUES.includes(b.block_type)
      ? b.block_type
      : "technique",
    duration_minutes:
      b.duration_minutes && b.duration_minutes > 0
        ? Math.round(b.duration_minutes)
        : null,
    comment: b.comment.trim().slice(0, 2000) || null,
    skill_id: b.skill_id || null,
    system_id: b.system_id || null,
    position: i,
  }));
}

function trainingFields(p: SessionPayload, fallbackCoach: string) {
  const total = totalMinutes(p.blocks);
  return {
    objective: p.title.trim().slice(0, 200),
    date: p.date,
    start_time: p.start_time || null,
    team_id: p.team_id,
    gym_id: p.gym_id || null,
    coach_id: p.coach_id || fallbackCoach,
    intensity: p.intensity || null,
    focus: FOCUS_VALUES.includes(p.focus ?? "") ? p.focus : null,
    duration_minutes: total > 0 ? total : null,
  };
}

export async function createSession(p: SessionPayload): Promise<Result> {
  const profile = await requireProfile();
  if (!SESSION_EDIT_ROLES.includes(profile.role))
    return { error: "Action réservée à l'équipe encadrante." };
  const invalid = validate(p);
  if (invalid) return { error: invalid };

  const rec = p.recurrence ?? null;
  if (rec) {
    const bad = validateRecurrence(p.date, rec);
    if (bad) return { error: bad };
  }
  const dates = rec ? expandDates(p.date, rec) : [p.date];
  if (dates.length === 0) return { error: "Aucune date ne correspond à cette périodicité." };
  const series_id = dates.length > 1 ? crypto.randomUUID() : null;

  const supabase = await createClient();
  const fields = trainingFields(p, profile.id);
  const { data, error } = await supabase
    .from("trainings")
    .insert(dates.map((date) => ({ ...fields, date, series_id })))
    .select("id, date");
  if (error || !data || data.length === 0)
    return { error: error?.message ?? "Création impossible." };
  const ids = data.map((d) => d.id);
  const firstId = [...data].sort((a, b) => a.date.localeCompare(b.date))[0].id;

  if (p.blocks.length > 0) {
    const { error: blocksError } = await supabase
      .from("training_exercises")
      .insert(ids.flatMap((id) => blockRows(id, p.blocks)));
    if (blocksError) {
      await supabase.from("trainings").delete().in("id", ids);
      return { error: blocksError.message };
    }
  }
  revalidatePath("/seances");
  revalidatePath("/calendrier");
  return { id: firstId, count: ids.length };
}

/** Supprime une séance périodique et toutes les suivantes de la même série (celles qui ont déjà des présences ou des feedbacks sont conservées). */
export async function deleteSeriesFrom(id: string): Promise<Result> {
  const profile = await requireProfile();
  if (!SESSION_EDIT_ROLES.includes(profile.role))
    return { error: "Action réservée à l'équipe encadrante." };
  const supabase = await createClient();
  const { data: me } = await supabase.from("trainings").select("series_id, date").eq("id", id).maybeSingle();
  if (!me?.series_id) return deleteSession(id);
  const { data: rows } = await supabase
    .from("trainings")
    .select("id")
    .eq("series_id", me.series_id)
    .gte("date", me.date);
  const ids = (rows ?? []).map((r) => r.id);
  if (ids.length === 0) return { error: "Aucune séance à supprimer." };
  let count = 0;
  for (const tid of ids) {
    await supabase.from("training_exercises").delete().eq("training_id", tid);
    const { data, error } = await supabase.from("trainings").delete().eq("id", tid).select("id");
    if (!error && data && data.length > 0) count++;
  }
  revalidatePath("/seances");
  revalidatePath("/calendrier");
  if (count === 0) return { error: "Suppression refusée (séances avec présences ou feedbacks)." };
  return { count };
}

export async function updateSession(
  id: string,
  p: SessionPayload,
): Promise<Result> {
  const profile = await requireProfile();
  if (!SESSION_EDIT_ROLES.includes(profile.role))
    return { error: "Action réservée à l'équipe encadrante." };
  const invalid = validate(p);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { data: old } = await supabase
    .from("training_exercises")
    .select("id")
    .eq("training_id", id);
  const { data: updated, error } = await supabase
    .from("trainings")
    .update({ ...trainingFields(p, profile.id), coach_id: p.coach_id || null })
    .eq("id", id)
    .select("id");
  if (error) return { error: error.message };
  if (!updated || updated.length === 0)
    return { error: "Modification refusée." };

  // nouveaux blocs d'abord, anciens ensuite : rien n'est perdu si l'insertion échoue
  if (p.blocks.length > 0) {
    const { error: blocksError } = await supabase
      .from("training_exercises")
      .insert(blockRows(id, p.blocks));
    if (blocksError) return { error: blocksError.message };
  }
  const oldIds = (old ?? []).map((b) => b.id);
  if (oldIds.length > 0)
    await supabase.from("training_exercises").delete().in("id", oldIds);

  revalidatePath("/seances");
  revalidatePath(`/seances/${id}`);
  return { id };
}

export async function deleteSession(id: string): Promise<Result> {
  const profile = await requireProfile();
  if (!SESSION_EDIT_ROLES.includes(profile.role))
    return { error: "Action réservée à l'équipe encadrante." };
  const supabase = await createClient();
  await supabase.from("training_exercises").delete().eq("training_id", id);
  const { data, error } = await supabase
    .from("trainings")
    .delete()
    .eq("id", id)
    .select("id");
  if (error)
    return {
      error: error.message.includes("foreign key")
        ? "Cette séance a des feedbacks ou des présences : elle ne peut pas être supprimée."
        : error.message,
    };
  if (!data || data.length === 0) return { error: "Suppression refusée." };
  revalidatePath("/seances");
  return {};
}

export async function updateTrainingGym(trainingId: string, gymId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("trainings")
    .update({ gym_id: gymId || null })
    .eq("id", trainingId);
  if (error) return { error: error.message };
  revalidatePath("/seances");
  return { success: true };
}

/** Enregistre (ou efface) la présence d'un joueur à une séance. */
export async function setAttendance(trainingId: string, playerId: string, status: string | null): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (!SESSION_EDIT_ROLES.includes(profile.role)) return { error: "Action réservée au staff." };
  const supabase = await createClient();
  if (status === null) {
    const { error } = await supabase.from("attendance").delete().eq("training_id", trainingId).eq("player_id", playerId);
    if (error) return { error: error.message };
  } else {
    if (!["present", "absent", "absent_justifie", "retard", "blesse"].includes(status)) return { error: "Statut invalide." };
    const { error } = await supabase
      .from("attendance")
      .upsert(
        { training_id: trainingId, player_id: playerId, status: status as "present" },
        { onConflict: "training_id,player_id" },
      );
    if (error) return { error: error.message };
  }
  revalidatePath(`/seances/${trainingId}`);
  revalidatePath("/dashboard");
  revalidatePath("/joueurs");
  return {};
}

/** Marque tous les joueurs non renseignés comme présents. */
export async function markAllPresent(trainingId: string, playerIds: string[]): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (!SESSION_EDIT_ROLES.includes(profile.role)) return { error: "Action réservée au staff." };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("attendance").select("player_id").eq("training_id", trainingId);
  const done = new Set((existing ?? []).map((r) => r.player_id));
  const rows = playerIds.filter((id) => !done.has(id)).map((player_id) => ({ training_id: trainingId, player_id, status: "present" as const }));
  if (rows.length > 0) {
    const { error } = await supabase.from("attendance").insert(rows);
    if (error) return { error: error.message };
  }
  revalidatePath(`/seances/${trainingId}`);
  revalidatePath("/dashboard");
  return {};
}
