import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { SESSION_EDIT_ROLES } from "@/lib/sessions";
import { getSessionFormData } from "@/lib/sessions-data";
import { TrainingCalendar } from "@/components/training-calendar";

/**
 * Rubrique Calendrier : toutes les séances.
 * - joueur : uniquement les séances de sa catégorie ;
 * - parent : les séances des catégories de ses enfants ;
 * - coach : par défaut ses créneaux (ses séances + celles de ses catégories), bouton « Tous les créneaux » ;
 * - direction, préparateur physique : tout.
 */
export default async function CalendrierPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ data: all }, { teams, gyms, coaches }] = await Promise.all([
    supabase.from("trainings").select("*, teams(name), gyms(name)").order("date", { ascending: false }),
    getSessionFormData(),
  ]);
  let trainings = all ?? [];

  let mineIds: string[] | undefined;
  let compact = false;
  let subtitle = "Toutes les séances de l'académie.";

  if (profile.role === "joueur") {
    const { data: player } = await supabase.from("players").select("team_id").eq("user_id", profile.id).maybeSingle();
    trainings = trainings.filter((t) => !!player?.team_id && t.team_id === player.team_id);
    compact = true;
    subtitle = "Tes séances d'entraînement.";
  } else if (profile.role === "parent") {
    const { data: links } = await supabase.from("parent_player").select("players(team_id)").eq("parent_id", profile.id);
    const teamIds = new Set((links ?? []).map((l) => l.players?.team_id).filter((x): x is string => !!x));
    trainings = trainings.filter((t) => !!t.team_id && teamIds.has(t.team_id));
    compact = true;
    subtitle = "Les séances de la catégorie de votre enfant.";
  } else if (profile.role === "coach") {
    const { data: tc } = await supabase.from("team_coaches").select("team_id").eq("coach_id", profile.id);
    const myTeams = new Set((tc ?? []).map((x) => x.team_id));
    mineIds = trainings.filter((t) => t.coach_id === profile.id || (!!t.team_id && myTeams.has(t.team_id))).map((t) => t.id);
    subtitle = "Tes créneaux par défaut ; bascule sur « Tous les créneaux » pour voir le planning complet.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-3xl font-bold uppercase">Calendrier</h1>
          <p className="text-sm" style={{ color: "var(--text-faint)" }}>{subtitle}</p>
        </div>
        {SESSION_EDIT_ROLES.includes(profile.role) && (
          <Link href="/seances/nouvelle" className="btn-primary">+ Nouvelle séance</Link>
        )}
      </div>
      <TrainingCalendar trainings={trainings} teams={teams} coaches={coaches} gyms={gyms} mineIds={mineIds} compact={compact} />
    </div>
  );
}
