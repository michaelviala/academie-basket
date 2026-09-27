"use client";

import { useRef } from "react";
import { updateGoalStatus } from "@/app/(app)/joueurs/[id]/actions";

const STATUS_OPTIONS = [
  { value: "a_commencer", label: "À commencer" },
  { value: "en_cours", label: "En cours" },
  { value: "atteint", label: "Atteint" },
  { value: "partiellement_atteint", label: "Partiellement atteint" },
  { value: "abandonne", label: "Abandonné" },
];

export function GoalStatusForm({
  playerId,
  goalId,
  currentStatus,
}: {
  playerId: string;
  goalId: string;
  currentStatus: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updateGoalStatus} className="shrink-0">
      <input type="hidden" name="goal_id" value={goalId} />
      <input type="hidden" name="player_id" value={playerId} />
      <select
        name="status"
        defaultValue={currentStatus}
        className="rounded-full border-0 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
        onChange={() => formRef.current?.requestSubmit()}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </form>
  );
}
