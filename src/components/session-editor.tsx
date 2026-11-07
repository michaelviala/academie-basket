"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  createSession,
  deleteSession,
  updateSession,
} from "@/app/(app)/seances/actions";
import {
  BLOCK_TYPES,
  INTENSITIES,
  blockColor,
  clockAt,
  totalMinutes,
  type BlockDraft,
} from "@/lib/sessions";

type Option = { id: string; name: string };
type Skill = { id: string; category: string; name: string };

export type SessionInitial = {
  title: string;
  date: string;
  start_time: string;
  team_id: string;
  gym_id: string;
  coach_id: string;
  intensity: string;
  blocks: Omit<BlockDraft, "key">[];
};

let counter = 0;
const newKey = () => `b${Date.now()}-${counter++}`;

export function SessionEditor({
  sessionId,
  initial,
  teams,
  gyms,
  coaches,
  skills,
  systems = [],
}: {
  sessionId?: string;
  initial: SessionInitial;
  teams: Option[];
  gyms: Option[];
  coaches: { id: string; full_name: string }[];
  skills: Skill[];
  systems?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial.title);
  const [date, setDate] = useState(initial.date);
  const [startTime, setStartTime] = useState(initial.start_time);
  const [teamId, setTeamId] = useState(initial.team_id);
  const [gymId, setGymId] = useState(initial.gym_id);
  const [coachId, setCoachId] = useState(initial.coach_id);
  const [intensity, setIntensity] = useState(initial.intensity);
  const [blocks, setBlocks] = useState<BlockDraft[]>(() =>
    initial.blocks.map((b) => ({ ...b, key: newKey() })),
  );

  const total = totalMinutes(blocks);
  const skillGroups = useMemo(() => {
    const g = new Map<string, Skill[]>();
    skills.forEach((s) => g.set(s.category, [...(g.get(s.category) ?? []), s]));
    return Array.from(g.entries());
  }, [skills]);

  const patch = (key: string, p: Partial<BlockDraft>) =>
    setBlocks((cur) => cur.map((b) => (b.key === key ? { ...b, ...p } : b)));
  const move = (i: number, dir: -1 | 1) =>
    setBlocks((cur) => {
      const j = i + dir;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const add = (type: (typeof BLOCK_TYPES)[number]) =>
    setBlocks((cur) => [
      ...cur,
      {
        key: newKey(),
        name: type.label,
        block_type: type.value,
        duration_minutes: type.minutes,
        comment: "",
        skill_id: "",
        system_id: "",
      },
    ]);

  function save() {
    setError(null);
    const payload = {
      title,
      date,
      start_time: startTime,
      team_id: teamId,
      gym_id: gymId,
      coach_id: coachId,
      intensity,
      blocks: blocks.map((b) => ({
        name: b.name,
        block_type: b.block_type,
        duration_minutes: b.duration_minutes,
        comment: b.comment,
        skill_id: b.skill_id,
        system_id: b.system_id,
      })),
    };
    startTransition(async () => {
      const r = sessionId
        ? await updateSession(sessionId, payload)
        : await createSession(payload);
      if (r.error || !r.id)
        return setError(r.error ?? "Enregistrement impossible.");
      router.push(`/seances/${r.id}`);
      router.refresh();
    });
  }

  function remove() {
    if (
      !sessionId ||
      !window.confirm("Supprimer définitivement cette séance et son déroulé ?")
    )
      return;
    setError(null);
    startTransition(async () => {
      const r = await deleteSession(sessionId);
      if (r.error) return setError(r.error);
      router.push("/seances");
      router.refresh();
    });
  }

  return (
    <form
      className="card space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_140px]">
        <label className="label">
          Titre
          <input
            className="input mt-1 w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ex. Tir en mouvement — U13"
            required
          />
        </label>
        <label className="label">
          Date
          <input
            className="input mt-1 w-full"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
        <label className="label">
          Début
          <input
            className="input mt-1 w-full"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="label">
          Catégorie
          <select
            className="input mt-1 w-full"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            required
          >
            <option value="" disabled>
              Choisir…
            </option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          Gymnase
          <select
            className="input mt-1 w-full"
            value={gymId}
            onChange={(e) => setGymId(e.target.value)}
          >
            <option value="">Non défini</option>
            {gyms.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          Coach
          <select
            className="input mt-1 w-full"
            value={coachId}
            onChange={(e) => setCoachId(e.target.value)}
          >
            <option value="">Moi</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          Intensité
          <select
            className="input mt-1 w-full"
            value={intensity}
            onChange={(e) => setIntensity(e.target.value)}
          >
            <option value="">Non précisée</option>
            {INTENSITIES.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="display text-xl font-bold uppercase">Déroulé</h2>
          <span
            className="font-mono text-xs"
            style={{ color: "var(--text-faint)" }}
          >
            {total} min · {blocks.length} bloc{blocks.length > 1 ? "s" : ""}
          </span>
        </div>

        {blocks.length > 0 && (
          <div className="mb-4 flex h-2 gap-1 overflow-hidden rounded-full">
            {blocks.map((b) => (
              <div
                key={b.key}
                style={{
                  flex: b.duration_minutes || 1,
                  background: blockColor(b.block_type),
                }}
              />
            ))}
          </div>
        )}

        <div className="space-y-3">
          {blocks.map((b, i) => {
            const clock = clockAt(startTime, totalMinutes(blocks.slice(0, i)));
            const color = blockColor(b.block_type);
            return (
              <div key={b.key} className="flex gap-2 sm:gap-3">
                <div
                  className="hidden w-12 shrink-0 pt-4 font-mono text-xs sm:block"
                  style={{ color: "var(--text-faint)" }}
                >
                  {clock ?? ""}
                </div>
                <div
                  className="flex min-w-0 flex-1 gap-2 rounded-xl p-3"
                  style={{
                    background: "var(--surf-2)",
                    border: "1px solid var(--border)",
                    borderLeft: `4px solid ${color}`,
                  }}
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    {clock && (
                      <p
                        className="font-mono text-[11px] sm:hidden"
                        style={{ color: "var(--text-faint)" }}
                      >
                        {clock}
                      </p>
                    )}
                    <div className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_170px_auto]">
                      <input
                        className="input col-span-2 w-full font-semibold sm:col-span-1"
                        value={b.name}
                        onChange={(e) => patch(b.key, { name: e.target.value })}
                        placeholder="Titre du bloc"
                        aria-label="Titre du bloc"
                      />
                      <select
                        className="input w-full"
                        value={b.block_type}
                        onChange={(e) =>
                          patch(b.key, { block_type: e.target.value })
                        }
                        aria-label="Type de bloc"
                      >
                        {BLOCK_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1.5">
                        <input
                          className="input w-20 text-center"
                          type="number"
                          min={1}
                          max={600}
                          inputMode="numeric"
                          value={b.duration_minutes ?? ""}
                          onChange={(e) =>
                            patch(b.key, {
                              duration_minutes: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                          aria-label="Durée en minutes"
                        />
                        <span
                          className="text-xs"
                          style={{ color: "var(--text-faint)" }}
                        >
                          min
                        </span>
                      </div>
                    </div>
                    <input
                      className="input w-full"
                      value={b.comment}
                      onChange={(e) =>
                        patch(b.key, { comment: e.target.value })
                      }
                      placeholder="Consignes, organisation, variantes…"
                      aria-label="Consignes"
                    />
                    {systems.length > 0 && (
                      <label
                        className="flex flex-wrap items-center gap-2 text-xs"
                        style={{ color: "var(--text-faint)" }}
                      >
                        Système :
                        <select
                          className="input"
                          style={{ width: "auto", maxWidth: "100%" }}
                          value={b.system_id}
                          onChange={(e) =>
                            patch(b.key, { system_id: e.target.value })
                          }
                        >
                          <option value="">— Aucun —</option>
                          {systems.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {skills.length > 0 && (
                      <label
                        className="flex flex-wrap items-center gap-2 text-xs"
                        style={{ color: "var(--text-faint)" }}
                      >
                        Compétence travaillée :
                        <select
                          className="input"
                          style={{ width: "auto", maxWidth: "100%" }}
                          value={b.skill_id}
                          onChange={(e) =>
                            patch(b.key, { skill_id: e.target.value })
                          }
                        >
                          <option value="">— Aucune —</option>
                          {skillGroups.map(([cat, list]) => (
                            <optgroup key={cat} label={cat}>
                              {list.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: "6px 9px" }}
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      aria-label="Monter"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: "6px 9px" }}
                      disabled={i === blocks.length - 1}
                      onClick={() => move(i, 1)}
                      aria-label="Descendre"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: "6px 9px", color: "#f87171" }}
                      onClick={() =>
                        setBlocks((cur) => cur.filter((x) => x.key !== b.key))
                      }
                      aria-label="Supprimer le bloc"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {blocks.length === 0 && (
            <p
              className="rounded-lg p-4 text-sm"
              style={{
                background: "var(--surf-2)",
                color: "var(--text-faint)",
              }}
            >
              Aucun bloc : ajoute ton premier bloc ci-dessous.
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
            Ajouter :
          </span>
          {BLOCK_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => add(t)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{
                background: "var(--surf-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: t.color }}
              />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}

      <div
        className="flex flex-wrap items-center gap-3 border-t pt-4"
        style={{ borderColor: "var(--border)" }}
      >
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending
            ? "Enregistrement…"
            : sessionId
              ? "Enregistrer la séance"
              : "Créer la séance"}
        </button>
        <Link
          href={sessionId ? `/seances/${sessionId}` : "/seances"}
          className="btn-secondary"
        >
          Annuler
        </Link>
        {sessionId && (
          <button
            type="button"
            className="btn-secondary ml-auto"
            style={{ color: "#f87171" }}
            onClick={remove}
            disabled={pending}
          >
            Supprimer la séance
          </button>
        )}
      </div>
    </form>
  );
}
