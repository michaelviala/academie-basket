import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { SESSION_EDIT_ROLES } from "@/lib/sessions";
import { getSessionFormData } from "@/lib/sessions-data";
import { SeancesHeader } from "@/components/seances-tabs";
import { TrainingCalendar } from "@/components/training-calendar";

export default async function CalendrierPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ data: trainings }, { teams, gyms, coaches }] = await Promise.all([
    supabase
      .from("trainings")
      .select("*, teams(name), gyms(name)")
      .order("date", { ascending: false }),
    getSessionFormData(),
  ]);

  return (
    <div className="space-y-6">
      <SeancesHeader
        active="calendrier"
        canCreate={SESSION_EDIT_ROLES.includes(profile.role)}
      />
      <TrainingCalendar
        trainings={trainings ?? []}
        teams={teams}
        coaches={coaches}
        gyms={gyms}
      />
    </div>
  );
}
