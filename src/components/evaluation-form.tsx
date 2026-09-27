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
}: {
  skills: Skill[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [evaluationType, setEvaluationType] = useState("");

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
      <input className="input" type="number" name="score" min={1} max={10} step={0.5} placeholder="Score" required />
      <input className="input" type="date" name="evaluated_at" />
      <textarea className="input col-span-2" name="comment" placeholder="Commentaire" rows={2} />
      <button className="btn-primary col-span-2" type="submit">Enregistrer l&apos;évaluation</button>
    </form>
  );
}
