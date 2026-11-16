"use client";

import { useMemo, useState } from "react";

type Skill = { id: string; category: string; name: string };

const CATEGORIES_BY_TYPE: Record<string, string[]> = {
  technique: ["tir", "dribble", "finition", "passe", "defense", "rebond"],
  tactique: ["tactique"],
  physique: ["physique"],
  mental: ["mental"],
};

export function EvaluationForm({
  skills,
  action,
  initialType = "",
}: {
  skills: Skill[];
  action: (formData: FormData) => void | Promise<void>;
  /** Rubrique présélectionnée (ouverture depuis une brique de la fiche). */
  initialType?: string;
}) {
  const [evaluationType, setEvaluationType] = useState(initialType);
  const [score, setScore] = useState(5);
  const scoreColor = score >= 7 ? "var(--green)" : score >= 5 ? "#f59e0b" : "#f87171";

  const filteredSkills = useMemo(() => {
    if (!evaluationType) return skills;
    const categories = CATEGORIES_BY_TYPE[evaluationType] ?? [];
    return skills.filter((s) => categories.includes(s.category));
  }, [skills, evaluationType]);

  return (
    <form action={action} className="grid grid-cols-2 gap-3">
      <select
        name="evaluation_type"
        className="input col-span-2"
        required
        value={evaluationType}
        onChange={(e) => setEvaluationType(e.target.value)}
      >
        <option value="" disabled>Type d&apos;évaluation</option>
        <option value="technique">Technique</option>
        <option value="tactique">Tactique</option>
        <option value="physique">Physique</option>
        <option value="mental">Mental</option>
      </select>
      <select className="input col-span-2" name="skill_id" defaultValue="">
        <option value="">
          {evaluationType ? "Compétence (optionnel)" : "Choisis d'abord un type d'évaluation"}
        </option>
        {filteredSkills.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <div className="col-span-2 rounded-xl px-3 py-3" style={{ background: "var(--surf-2)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>Note</span>
          <span className="display text-3xl font-bold leading-none" style={{ color: scoreColor }}>
            {score.toFixed(1).replace(".0", "")}<span className="text-sm font-normal" style={{ color: "var(--text-faint)" }}> /10</span>
          </span>
        </div>
        <input
          type="range"
          name="score"
          min={1}
          max={10}
          step={0.5}
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="score-slider mt-2 w-full"
          style={{ accentColor: scoreColor }}
          aria-label="Note sur 10"
          aria-valuetext={`${score} sur 10`}
        />
        <div className="mt-1 flex justify-between text-[10px]" style={{ color: "var(--text-faint)" }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <span key={n}>{n}</span>)}
        </div>
      </div>
      <input className="input col-span-2" type="date" name="evaluated_at" defaultValue={new Date().toISOString().slice(0, 10)} />
      <textarea className="input col-span-2" name="comment" placeholder="Commentaire" rows={2} />
      <button className="btn-primary col-span-2" type="submit">Enregistrer l&apos;évaluation</button>
    </form>
  );
}
