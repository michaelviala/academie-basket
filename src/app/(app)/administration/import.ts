"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { norm, type ParsedPlayer } from "@/lib/import-players";

export type ImportResult = {
  error?: string;
  created: number;
  existing: number;
  guardiansAdded: number;
  teamsCreated: string[];
  noTeam: string[];
};
const empty: ImportResult = { created: 0, existing: 0, guardiansAdded: 0, teamsCreated: [], noTeam: [] };

export async function importPlayers(rows: ParsedPlayer[], createTeams: boolean): Promise<ImportResult> {
  const me = await requireProfile();
  if (!["admin", "directeur_sportif"].includes(me.role)) return { ...empty, error: "Action réservée à la direction." };
  if (rows.length === 0) return { ...empty, error: "Aucun joueur à importer." };
  if (rows.length > 1000) return { ...empty, error: "Trop de lignes (1000 maximum par import)." };

  const supabase = await createClient();
  const [{ data: teams }, { data: season }, { data: players }] = await Promise.all([
    supabase.from("teams").select("id, name, category"),
    supabase.from("seasons").select("id").eq("is_active", true).maybeSingle(),
    supabase.from("players").select("id, first_name, last_name, birth_date, team_id"),
  ]);

  const result: ImportResult = { ...empty, teamsCreated: [], noTeam: [] };
  const teamIds = new Map<string, string>();
  for (const t of teams ?? []) {
    teamIds.set(norm(t.name), t.id);
    if (!teamIds.has(norm(t.category))) teamIds.set(norm(t.category), t.id);
  }

  // Équipes à créer
  if (createTeams && season) {
    const wanted = [...new Set(rows.map((r) => r.team.trim()).filter((n) => n && !teamIds.has(norm(n))))];
    for (const name of wanted) {
      if (teamIds.has(norm(name))) continue;
      const { data, error } = await supabase.from("teams").insert({ name, category: name, season_id: season.id }).select("id").single();
      if (!error && data) { teamIds.set(norm(name), data.id); result.teamsCreated.push(name); }
    }
  }

  const existingKey = new Map<string, { id: string; team_id: string | null }>();
  for (const p of players ?? []) existingKey.set(`${norm(p.last_name)}|${norm(p.first_name)}|${p.birth_date}`, { id: p.id, team_id: p.team_id });

  const toInsert: { row: ParsedPlayer; team_id: string | null }[] = [];
  const idByRow = new Map<ParsedPlayer, string>();
  const noTeam = new Set<string>();
  for (const r of rows) {
    const team_id = r.team ? teamIds.get(norm(r.team)) ?? null : null;
    if (r.team && !team_id) noTeam.add(r.team);
    const ex = existingKey.get(`${norm(r.lastName)}|${norm(r.firstName)}|${r.birthDate}`);
    if (ex) {
      idByRow.set(r, ex.id);
      result.existing++;
      if (!ex.team_id && team_id) await supabase.from("players").update({ team_id }).eq("id", ex.id);
    } else toInsert.push({ row: r, team_id });
  }
  result.noTeam = [...noTeam];

  for (let i = 0; i < toInsert.length; i += 100) {
    const chunk = toInsert.slice(i, i + 100);
    const { data, error } = await supabase
      .from("players")
      .insert(
        chunk.map(({ row, team_id }) => ({
          first_name: row.firstName,
          last_name: row.lastName,
          birth_date: row.birthDate,
          team_id,
          jersey_number: row.jersey,
          season_id: season?.id ?? null,
          entry_date: new Date().toISOString().slice(0, 10),
        })),
      )
      .select("id, first_name, last_name, birth_date");
    if (error || !data) return { ...result, error: `Import interrompu : ${error?.message ?? "erreur"}. ${result.created} joueur(s) déjà créé(s).` };
    for (const d of data) {
      const row = chunk.find((c) => norm(c.row.lastName) === norm(d.last_name) && norm(c.row.firstName) === norm(d.first_name) && c.row.birthDate === d.birth_date)?.row;
      if (row) idByRow.set(row, d.id);
    }
    result.created += data.length;
  }

  // Parents : on n'ajoute que ceux qui n'existent pas déjà (même e-mail ou même nom)
  const ids = [...idByRow.values()];
  const { data: existingG } = ids.length ? await supabase.from("player_guardians").select("player_id, full_name, email, is_primary").in("player_id", ids) : { data: [] };
  const seen = new Map<string, { names: Set<string>; emails: Set<string>; primary: boolean }>();
  for (const g of existingG ?? []) {
    const s = seen.get(g.player_id) ?? { names: new Set(), emails: new Set(), primary: false };
    s.names.add(norm(g.full_name));
    if (g.email) s.emails.add(g.email.toLowerCase());
    if (g.is_primary) s.primary = true;
    seen.set(g.player_id, s);
  }
  const newG: { player_id: string; full_name: string; relationship: string; email: string | null; phone: string | null; is_primary: boolean }[] = [];
  for (const [row, playerId] of idByRow) {
    const s = seen.get(playerId) ?? { names: new Set(), emails: new Set(), primary: false };
    for (const g of row.guardians) {
      if (s.names.has(norm(g.fullName)) || (g.email && s.emails.has(g.email))) continue;
      newG.push({ player_id: playerId, full_name: g.fullName, relationship: g.relationship, email: g.email || null, phone: g.phone || null, is_primary: !s.primary });
      s.primary = true;
      s.names.add(norm(g.fullName));
      if (g.email) s.emails.add(g.email);
    }
  }
  for (let i = 0; i < newG.length; i += 200) {
    const { error } = await supabase.from("player_guardians").insert(newG.slice(i, i + 200));
    if (error) return { ...result, error: `Joueurs importés, mais erreur sur les parents : ${error.message}` };
    result.guardiansAdded += Math.min(200, newG.length - i);
  }

  revalidatePath("/administration");
  revalidatePath("/joueurs");
  revalidatePath("/dashboard");
  return result;
}
