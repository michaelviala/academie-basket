"use client";

import { useTransition } from "react";
import { updateTrainingGym } from "@/app/(app)/entrainements/actions";

export function TrainingGymSelect({
  trainingId,
  gyms,
  currentGymId,
}: {
  trainingId: string;
  gyms: { id: string; name: string }[];
  currentGymId: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      className="input"
      style={{ padding: "4px 8px", fontSize: 12, width: "auto" }}
      defaultValue={currentGymId ?? ""}
      disabled={isPending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        const gymId = e.target.value;
        startTransition(async () => {
          await updateTrainingGym(trainingId, gymId);
        });
      }}
    >
      <option value="">Gymnase non défini</option>
      {gyms.map((g) => (
        <option key={g.id} value={g.id}>{g.name}</option>
      ))}
    </select>
  );
}
