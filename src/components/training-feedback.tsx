"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { deleteFeedback, upsertFeedback } from "@/app/(app)/seances/[id]/actions";
import { DictationField } from "@/components/dictation-field";
import { AddPlayerVideo, PlayerClipList, type PlayerClip } from "@/components/player-video";
import { discardUpload, uploadVideo, FEEDBACK_MAX_SECONDS, videoDuration } from "@/lib/player-video";
import { VideoRecorder } from "@/components/video-recorder";
import { addPlayerVideo } from "@/app/(app)/videos/player-video";

const PRIORITY_LABELS: Record<string, string> = {
  haute: "Haute",
  moyenne: "Moyenne",
  basse: "Basse",
};

type Feedback = {
  id: string;
  positives: string | null;
  improvements: string | null;
  priority: string | null;
  next_session_goal: string | null;
  created_at: string;
};

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
};

export function TrainingFeedback({
  trainingId,
  players,
  feedbacksByPlayer,
  videosByPlayer,
  canManage,
}: {
  trainingId: string;
  players: Player[];
  feedbacksByPlayer: Record<string, Feedback[]>;
  videosByPlayer: Record<string, PlayerClip[]>;
  canManage: boolean;
}) {
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [filming, setFilming] = useState(false);
  const [camFail, setCamFail] = useState<string | null>(null);
  const nativeFilm = useRef<HTMLInputElement>(null);

  async function chooseVideo(f: File | null) {
    if (!f) return setVideo(null);
    const d = await videoDuration(f);
    if (d && d > FEEDBACK_MAX_SECONDS + 0.7) {
      setVideo(null);
      return setError(`Vidéo de ${Math.round(d)} s : ${FEEDBACK_MAX_SECONDS} secondes maximum.`);
    }
    setError(null);
    setVideo(f);
  }

  function handleSubmit(player: Player, formData: FormData) {
    setError(null);
    const file = video;
    startTransition(async () => {
      try {
        let up: Awaited<ReturnType<typeof uploadVideo>> | null = null;
        if (file) {
          up = await uploadVideo(file, undefined, FEEDBACK_MAX_SECONDS);
          if ("error" in up) throw new Error(up.error);
        }
        try {
          await upsertFeedback(trainingId, player.id, formData);
        } catch (e) {
          if (up && "ok" in up) await discardUpload(up.ok);
          throw e;
        }
        if (up && "ok" in up) {
          const res = await addPlayerVideo({
            playerId: player.id,
            trainingId,
            title: `${player.first_name} ${player.last_name} · exercice`,
            note: String(formData.get("positives") ?? "") || String(formData.get("improvements") ?? ""),
            filePath: up.ok.filePath,
            thumbPath: up.ok.thumbPath,
            fileName: up.ok.fileName,
            fileSize: up.ok.fileSize,
            mime: up.ok.mime,
            duration: up.ok.duration,
          });
          if (res.error) {
            await discardUpload(up.ok);
            throw new Error(`Feedback enregistré, mais la vidéo a échoué : ${res.error}`);
          }
        }
        setVideo(null);
        setOpenPlayerId(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
      }
    });
  }

  function handleDelete(feedbackId: string) {
    startTransition(async () => {
      await deleteFeedback(trainingId, feedbackId);
    });
  }

  if (players.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-faint)" }}>
        Aucun joueur rattaché à cette catégorie pour l&apos;instant.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {filming && (
        <VideoRecorder
          maxSeconds={FEEDBACK_MAX_SECONDS}
          onCancel={() => setFilming(false)}
          onRecorded={(f) => { setFilming(false); void chooseVideo(f); }}
          onUnavailable={(why) => { setFilming(false); setCamFail(why); }}
        />
      )}
      <input ref={nativeFilm} type="file" accept="video/*" capture="environment" hidden onChange={(e) => void chooseVideo(e.target.files?.[0] ?? null)} />
      {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}
      {players.map((p) => {
        const history = feedbacksByPlayer[p.id] ?? [];
        const isOpen = openPlayerId === p.id;
        return (
          <div key={p.id} className="rounded-xl p-3" style={{ background: "var(--surf)", border: "1px solid var(--border)" }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href={`/joueurs/${p.id}`} className="flex items-center gap-2 text-sm font-semibold">
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: "var(--surf-2, #1c1f26)", color: "var(--text-faint)" }}
                  >
                    {p.first_name[0]}
                    {p.last_name[0]}
                  </span>
                )}
                {p.first_name} {p.last_name}
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                  {history.length} feedback{history.length > 1 ? "s" : ""}
                </span>
                {canManage && (
                  <AddPlayerVideo
                    small
                    playerId={p.id}
                    playerName={`${p.first_name} ${p.last_name}`}
                    trainingId={trainingId}
                  />
                )}
                {canManage && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: 11, padding: "5px 10px" }}
                    onClick={() => { setVideo(null); setOpenPlayerId(isOpen ? null : p.id); }}
                  >
                    {isOpen ? "Annuler" : "+ Feedback"}
                  </button>
                )}
              </div>
            </div>

            {history.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {history.map((f) => (
                  <div key={f.id} className="flex items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-xs" style={{ background: "var(--bg)" }}>
                    <div className="space-y-0.5">
                      {f.positives && <p><span style={{ color: "#4ade80" }}>+ </span>{f.positives}</p>}
                      {f.improvements && <p><span style={{ color: "#eda100" }}>→ </span>{f.improvements}</p>}
                      {f.next_session_goal && (
                        <p style={{ color: "var(--text-faint)" }}>Prochaine séance : {f.next_session_goal}</p>
                      )}
                      {f.priority && <span className="badge" style={{ fontSize: 10 }}>Priorité {PRIORITY_LABELS[f.priority] ?? f.priority}</span>}
                    </div>
                    {canManage && (
                      <button type="button" disabled={isPending} onClick={() => handleDelete(f.id)} style={{ color: "#f87171" }}>
                        🗑
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(videosByPlayer[p.id] ?? []).length > 0 && (
              <div className="mt-2">
                <PlayerClipList clips={videosByPlayer[p.id]} canManage={canManage} />
              </div>
            )}

            {isOpen && (
              <form
                action={(fd) => handleSubmit(p, fd)}
                className="mt-3 grid grid-cols-1 gap-2 border-t pt-3 sm:grid-cols-2"
                style={{ borderColor: "var(--border)" }}
              >
                <DictationField className="sm:col-span-2" name="positives" placeholder="Points positifs" rows={2} />
                <DictationField className="sm:col-span-2" name="improvements" placeholder="Axes d'amélioration" rows={2} />
                <select className="input" name="priority" defaultValue="">
                  <option value="">Priorité (optionnel)</option>
                  <option value="haute">Haute</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="basse">Basse</option>
                </select>
                <DictationField name="next_session_goal" placeholder="Objectif prochaine séance" multiline={false} maxLength={300} />
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                    🎥 Vidéo de l&apos;exercice (optionnel, {FEEDBACK_MAX_SECONDS} secondes maximum)
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="btn-secondary" onClick={() => { setCamFail(null); setFilming(true); }} disabled={isPending}>
                      📹 Filmer
                    </button>
                    <label className="btn-secondary cursor-pointer">
                      Choisir un fichier
                      <input
                        type="file"
                        accept="video/*"
                        hidden
                        onChange={(e) => {
                          const input = e.target;
                          const f = input.files?.[0] ?? null;
                          void chooseVideo(f).then(() => { input.value = ""; });
                        }}
                      />
                    </label>
                    {video && (
                      <span className="text-xs">
                        ✓ {video.name} · {(video.size / 1048576).toFixed(1)} Mo{" "}
                        <button type="button" className="underline" onClick={() => setVideo(null)}>retirer</button>
                      </span>
                    )}
                  </div>
                  {camFail && (
                    <p className="rounded border p-2 text-xs" style={{ borderColor: "#f87171", color: "#f87171" }}>
                      Caméra intégrée impossible : {camFail}{" "}
                      <button type="button" className="underline" onClick={() => nativeFilm.current?.click()}>
                        Ouvrir l&apos;appareil photo du téléphone (sans décompte, 12 s max)
                      </button>
                    </p>
                  )}
                </div>
                <button className="btn-primary sm:col-span-2" type="submit" disabled={isPending}>
                  Enregistrer le feedback
                </button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
