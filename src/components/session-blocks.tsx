"use client";

import { useTransition } from "react";
import { deleteBlock, moveBlock } from "@/app/(app)/entrainements/[id]/actions";

const BLOCK_TYPE_LABELS: Record<string, string> = {
  echauffement: "Échauffement",
  technique: "Technique",
  tactique: "Tactique",
  physique: "Physique",
  opposition: "Opposition",
  retour_au_calme: "Retour au calme",
};

const BLOCK_TYPE_COLORS: Record<string, string> = {
  echauffement: "#6b7280",
  technique: "#3b82f6",
  tactique: "#22c55e",
  physique: "#ff6a1f",
  opposition: "#f59e0b",
  retour_au_calme: "#6b7280",
};

type Block = {
  id: string;
  name: string;
  block_type: string;
  duration_minutes: number | null;
  comment: string | null;
  skills: { name: string } | null;
};

function formatClock(minutesFromStart: number, startTime: string | null): string | null {
  if (!startTime) return null;
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + minutesFromStart;
  const hh = Math.floor((total % (24 * 60)) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function SessionBlocks({
  trainingId,
  startTime,
  blocks,
  canManage,
}: {
  trainingId: string;
  startTime: string | null;
  blocks: Block[];
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  let elapsed = 0;
  const withTiming = blocks.map((b) => {
    const clock = formatClock(elapsed, startTime);
    elapsed += b.duration_minutes ?? 0;
    return { ...b, clock };
  });

  const totalMinutes = blocks.reduce((s, b) => s + (b.duration_minutes ?? 0), 0);

  function handleMove(blockId: string, direction: "up" | "down") {
    startTransition(async () => {
      await moveBlock(trainingId, blockId, direction);
    });
  }

  function handleDelete(blockId: string) {
    startTransition(async () => {
      await deleteBlock(trainingId, blockId);
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
          Déroulé
        </div>
        <div className="text-xs" style={{ color: "var(--text-faint)" }}>
          {totalMinutes} min · {blocks.length} bloc{blocks.length > 1 ? "s" : ""}
        </div>
      </div>

      {blocks.length > 0 && (
        <div className="mb-5 flex h-2 gap-1 overflow-hidden rounded-full">
          {blocks.map((b) => (
            <div
              key={b.id}
              style={{
                flex: b.duration_minutes || 1,
                background: BLOCK_TYPE_COLORS[b.block_type] ?? "#6b7280",
              }}
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        {withTiming.map((b, i) => (
          <div key={b.id} className="flex gap-3">
            <div className="w-14 flex-shrink-0 pt-3 text-right font-mono text-xs" style={{ color: "var(--text-faint)" }}>
              {b.clock ?? ""}
            </div>
            <div
              className="flex flex-1 items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: "var(--surf)",
                border: "1px solid var(--border)",
                borderLeftWidth: 3,
                borderLeftColor: BLOCK_TYPE_COLORS[b.block_type] ?? "#6b7280",
              }}
            >
              <div className="flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{b.name}</span>
                  <span className="badge" style={{ fontSize: 11 }}>{BLOCK_TYPE_LABELS[b.block_type] ?? b.block_type}</span>
                  {b.skills && (
                    <span className="text-xs" style={{ color: "var(--text-faint)" }}>🔗 {b.skills.name}</span>
                  )}
                </div>
                {b.comment && <p className="text-xs" style={{ color: "var(--text-faint)" }}>{b.comment}</p>}
              </div>
              <div className="display text-lg font-bold">
                {b.duration_minutes ?? "—"}
                <span className="ml-0.5 text-xs font-normal" style={{ color: "var(--text-faint)" }}>min</span>
              </div>
              {canManage && (
                <div className="flex flex-col items-center gap-1">
                  <button type="button" disabled={isPending || i === 0} onClick={() => handleMove(b.id, "up")} className="text-xs disabled:opacity-30" style={{ color: "var(--text-faint)" }}>▲</button>
                  <button type="button" disabled={isPending || i === withTiming.length - 1} onClick={() => handleMove(b.id, "down")} className="text-xs disabled:opacity-30" style={{ color: "var(--text-faint)" }}>▼</button>
                  <button type="button" disabled={isPending} onClick={() => handleDelete(b.id)} className="mt-1 text-xs" style={{ color: "#f87171" }}>🗑</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {blocks.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-faint)" }}>
            Aucun bloc pour l&apos;instant. Ajoute le premier ci-dessous.
          </p>
        )}
      </div>
    </div>
  );
}
