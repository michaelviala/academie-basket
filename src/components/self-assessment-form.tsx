"use client";

import { useState, useTransition } from "react";

type SelfAssessment = {
  id: string;
  strongest_skill: string | null;
  skill_to_improve: string | null;
  confidence_score: number | null;
  engagement_score: number | null;
  next_objective: string | null;
  useful_exercises: string | null;
  created_at: string;
};

function ScorePills({ name, value, onChange }: { name: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="flex-1 rounded-full py-2 text-sm font-semibold transition-colors"
          style={
            value === n
              ? { background: "var(--brand)", color: "#fff", border: "1px solid var(--brand)" }
              : { background: "var(--surf-2, #1c1f26)", color: "var(--text-faint)", border: "1px solid var(--border)" }
          }
        >
          {n}
        </button>
      ))}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

export function SelfAssessmentForm({
  playerId,
  history,
  action,
}: {
  playerId: string;
  history: SelfAssessment[];
  action: (playerId: string, formData: FormData) => Promise<void>;
}) {
  const [confidence, setConfidence] = useState(3);
  const [engagement, setEngagement] = useState(3);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await action(playerId, formData);
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
      }
    });
  }

  const latest = history[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-3">
        {latest && (
          <div className="rounded-lg p-3 text-sm" style={{ background: "var(--surf-2, #1c1f26)" }}>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
              Dernière auto-évaluation
            </p>
            <div className="flex justify-between py-1"><span style={{ color: "var(--text-faint)" }}>Confiance</span><span className="font-semibold">{latest.confidence_score ?? "—"}/5</span></div>
            <div className="flex justify-between border-t py-1" style={{ borderColor: "var(--border)" }}><span style={{ color: "var(--text-faint)" }}>Engagement</span><span className="font-semibold">{latest.engagement_score ?? "—"}/5</span></div>
          </div>
        )}
        {history.length > 0 && (
          <div className="rounded-lg p-3 text-sm" style={{ background: "var(--surf-2, #1c1f26)" }}>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Historique</p>
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
              {history.slice(0, 6).map((h) => h.created_at.slice(0, 10)).join(" · ")}
            </p>
          </div>
        )}
        {history.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucune auto-évaluation pour l&apos;instant.</p>
        )}
      </div>

      <form
        action={(fd) => handleSubmit(fd)}
        className="space-y-4"
      >
        {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}
        {done && <p className="text-xs" style={{ color: "#4ade80" }}>Auto-évaluation envoyée. Merci !</p>}

        <div>
          <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-faint)" }}>
            Quelle a été ta force principale cette semaine ?
          </label>
          <input className="input" name="strongest_skill" placeholder="Ex. Ma défense sur porteur de balle" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-faint)" }}>
            Quelle compétence veux-tu améliorer en priorité ?
          </label>
          <input className="input" name="skill_to_improve" placeholder="Ex. Le tir à 3 points en catch and shoot" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-faint)" }}>
            Niveau de confiance en match
          </label>
          <ScorePills name="confidence_score" value={confidence} onChange={setConfidence} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-faint)" }}>
            Niveau d&apos;engagement à l&apos;entraînement
          </label>
          <ScorePills name="engagement_score" value={engagement} onChange={setEngagement} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-faint)" }}>
            Quel objectif te fixes-tu pour la semaine prochaine ?
          </label>
          <input className="input" name="next_objective" placeholder="Ex. Faire 50 tirs à 3 points hors entraînement" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--text-faint)" }}>
            Quels exercices t&apos;ont été les plus utiles récemment ?
          </label>
          <input className="input" name="useful_exercises" placeholder="Ex. Répétitions de close-out en 1c1" />
        </div>

        <button className="btn-primary" type="submit" disabled={isPending}>
          Envoyer mon auto-évaluation
        </button>
      </form>
    </div>
  );
}
