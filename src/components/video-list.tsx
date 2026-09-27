"use client";

import { useState, useTransition } from "react";

const SKILL_CATEGORY_LABELS: Record<string, string> = {
  tir: "Tir",
  dribble: "Dribble",
  finition: "Finition",
  passe: "Passe",
  defense: "Défense",
  rebond: "Rebond",
  tactique: "Tactique",
  physique: "Physique",
  mental: "Mental",
};

type Video = {
  id: string;
  title: string;
  video_url: string | null;
  skill_category: string | null;
  duration_seconds: number | null;
  comment: string | null;
  created_at: string;
  players: { id: string; first_name: string; last_name: string } | null;
};

type PlayerOption = { id: string; first_name: string; last_name: string };

export function VideoList({
  videos,
  players,
  canManage,
  addAction,
  deleteAction,
}: {
  videos: Video[];
  players: PlayerOption[];
  canManage: boolean;
  addAction: (formData: FormData) => Promise<void>;
  deleteAction: (videoId: string) => Promise<{ error?: string; success?: boolean }>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addAction(formData);
        setShowForm(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
      }
    });
  }

  function handleDelete(videoId: string) {
    startTransition(async () => {
      await deleteAction(videoId);
    });
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--text-faint)" }}>
            {videos.length} vidéo{videos.length > 1 ? "s" : ""}
          </p>
          <button type="button" className="btn-secondary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Annuler" : "+ Ajouter une vidéo"}
          </button>
        </div>
      )}

      {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}

      {showForm && (
        <form action={(fd) => handleSubmit(fd)} className="grid gap-3 rounded-lg p-3 sm:grid-cols-2" style={{ background: "var(--surf-2, #1c1f26)" }}>
          <input className="input sm:col-span-2" name="title" placeholder="Titre (ex. Eurostep main gauche)" required />
          <input className="input sm:col-span-2" name="video_url" placeholder="Lien de la vidéo (YouTube, Drive...)" required />
          <select className="input" name="player_id" defaultValue="">
            <option value="">Joueur lié (optionnel)</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
            ))}
          </select>
          <select className="input" name="skill_category" defaultValue="">
            <option value="">Compétence (optionnel)</option>
            {Object.entries(SKILL_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <input className="input" type="number" name="duration_seconds" placeholder="Durée (secondes)" min={1} />
          <textarea className="input sm:col-span-2" name="comment" placeholder="Commentaire" rows={2} />
          <button className="btn-primary sm:col-span-2" type="submit" disabled={isPending}>Ajouter la vidéo</button>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <div key={v.id} className="card space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{v.title}</p>
              {canManage && (
                <button type="button" disabled={isPending} onClick={() => handleDelete(v.id)} style={{ color: "#f87171" }}>🗑</button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {v.players && <span className="badge">{v.players.first_name} {v.players.last_name}</span>}
              {v.skill_category && <span className="badge">{SKILL_CATEGORY_LABELS[v.skill_category] ?? v.skill_category}</span>}
              {v.duration_seconds && <span className="badge">{Math.round(v.duration_seconds / 60)} min</span>}
            </div>
            {v.comment && <p className="text-xs" style={{ color: "var(--text-faint)" }}>{v.comment}</p>}
            {v.video_url && (
              <a href={v.video_url} target="_blank" rel="noreferrer" className="text-xs font-semibold" style={{ color: "var(--brand)" }}>
                ▶ Voir la vidéo
              </a>
            )}
          </div>
        ))}
        {videos.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucune vidéo pour l&apos;instant.</p>
        )}
      </div>
    </div>
  );
}
