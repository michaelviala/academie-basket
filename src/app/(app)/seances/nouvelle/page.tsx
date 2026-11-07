import Link from "next/link";
import { redirect } from "next/navigation";
import { FOCUSES } from "@/lib/blocks";
import { requireProfile } from "@/lib/data";
import { getSessionFormData } from "@/lib/sessions-data";
import {
  BLOCK_TYPES,
  SESSION_EDIT_ROLES,
  formatDateLong,
} from "@/lib/sessions";
import { SessionEditor } from "@/components/session-editor";

export default async function NouvelleSeancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; focus?: string }>;
}) {
  const profile = await requireProfile();
  if (!SESSION_EDIT_ROLES.includes(profile.role)) redirect("/seances");
  const { date, focus } = await searchParams;
  const day =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : new Date().toISOString().slice(0, 10);
  const { teams, gyms, coaches, skills, systems } = await getSessionFormData();

  const defaults = BLOCK_TYPES.filter(
    (b) => b.value === "echauffement" || b.value === "technique",
  );

  return (
    <div className="space-y-5">
      <Link
        href="/seances"
        className="text-xs"
        style={{ color: "var(--text-faint)" }}
      >
        ← Retour aux séances
      </Link>
      <div>
        <p
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--brand)" }}
        >
          Séances · {formatDateLong(day)}
        </p>
        <h1 className="display mt-1 text-4xl font-bold uppercase">
          Nouvelle séance
        </h1>
      </div>
      <SessionEditor
        initial={{
          title: "",
          date: day,
          start_time: "18:00",
          team_id: teams.length === 1 ? teams[0].id : "",
          gym_id: "",
          coach_id: "",
          intensity: "",
          focus: focus && FOCUSES.some((f) => f.value === focus) ? focus : "",
          blocks: defaults.map((b) => ({
            name: b.label,
            block_type: b.value,
            duration_minutes: b.minutes,
            comment: "",
            skill_id: "",
            system_id: "",
          })),
        }}
        teams={teams.map((t) => ({ id: t.id, name: t.name }))}
        gyms={gyms.map((g) => ({ id: g.id, name: g.name }))}
        coaches={coaches}
        skills={skills}
        systems={systems}
      />
    </div>
  );
}
