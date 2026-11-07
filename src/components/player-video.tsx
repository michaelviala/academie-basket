"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { discardUpload, uploadVideo } from "@/lib/player-video";
import { useDictation } from "@/lib/dictation";
import { addPlayerVideo, deletePlayerVideo } from "@/app/(app)/videos/player-video";

export type PlayerClip = {
  id: string;
  sourceId: string;
  title: string;
  note: string | null;
  thumbUrl: string | null;
  createdAt: string;
  trainingLabel: string | null;
};

export type TrainingOption = { id: string; label: string };

/** Bouton + fenêtre : filmer ou choisir une vidéo, la rattacher au joueur (et à la séance). */
export function AddPlayerVideo({
  playerId,
  playerName,
  trainingId = null,
  trainings,
  small = false,
}: {
  playerId: string;
  playerName: string;
  trainingId?: string | null;
  trainings?: TrainingOption[];
  small?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const prefix = `${playerName} · `;
  const [title, setTitle] = useState(prefix);
  const [note, setNote] = useState("");
  const [training, setTraining] = useState<string>(trainingId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<{ clip: string; source: string } | null>(null);
  const noteRef = useRef("");
  useEffect(() => {
    noteRef.current = note;
  }, [note]);
  const getNote = useCallback(() => noteRef.current, []);
  const dictation = useDictation(getNote, setNote);
  const filmRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setTitle(prefix);
    setNote("");
    setError(null);
    setDoneId(null);
    setTraining(trainingId ?? "");
  }
  function close() {
    if (busy) return;
    dictation.stop();
    setOpen(false);
    reset();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("Filme ou choisis une vidéo.");
    dictation.stop();
    setError(null);
    setBusy(true);
    const up = await uploadVideo(file);
    if ("error" in up) {
      setBusy(false);
      return setError(up.error);
    }
    const res = await addPlayerVideo({
      playerId,
      trainingId: training || null,
      title: title.trim() === prefix.trim() ? `${prefix}exercice` : title,
      note,
      filePath: up.ok.filePath,
      thumbPath: up.ok.thumbPath,
      fileName: up.ok.fileName,
      fileSize: up.ok.fileSize,
      mime: up.ok.mime,
      duration: up.ok.duration,
    });
    setBusy(false);
    if (res.error || !res.clipId || !res.sourceId) {
      await discardUpload(up.ok);
      return setError(res.error ?? "Enregistrement impossible.");
    }
    setDoneId({ clip: res.clipId, source: res.sourceId });
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className="btn-secondary"
        style={small ? { fontSize: 11, padding: "5px 10px" } : undefined}
        onClick={() => setOpen(true)}
      >
        🎥 + Vidéo
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <div className="card w-full max-w-lg space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Vidéo de {playerName}</h3>
              <button type="button" className="text-2xl leading-none" onClick={close} aria-label="Fermer">×</button>
            </div>

            {doneId ? (
              <div className="space-y-3">
                <p className="text-sm">✓ Vidéo ajoutée à la fiche de {playerName}.</p>
                <div className="flex flex-wrap gap-2">
                  <Link className="btn-primary" href={`/videos/clip/${doneId.clip}`}>▶ Voir</Link>
                  <Link className="btn-secondary" href={`/videos/editeur/${doneId.source}?clip=${doneId.clip}`}>
                    ✂ Ajuster / annoter
                  </Link>
                  <button type="button" className="btn-secondary" onClick={() => { reset(); }}>+ Une autre</button>
                  <button type="button" className="btn-secondary" onClick={close}>Fermer</button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-primary" onClick={() => filmRef.current?.click()} disabled={busy}>
                    📹 Filmer
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => pickRef.current?.click()} disabled={busy}>
                    Choisir un fichier
                  </button>
                  <input ref={filmRef} type="file" accept="video/*" capture="environment" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  <input ref={pickRef} type="file" accept="video/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </div>
                <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                  {file
                    ? `${file.name} · ${(file.size / 1048576).toFixed(1)} Mo`
                    : "mp4 (H.264), 50 Mo max : une vidéo de quelques dizaines de secondes."}
                </p>
                <label className="label">
                  Titre <span style={{ color: "var(--text-faint)" }}>(nom du joueur ajouté automatiquement : complète avec l&apos;exercice)</span>
                  <input className="input mt-1 w-full" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} onFocus={(e) => { const el = e.target; setTimeout(() => el.setSelectionRange(el.value.length, el.value.length), 0); }} />
                </label>
                <div className="space-y-1.5">
                  <textarea className="input w-full" rows={3} placeholder="Commentaire (optionnel) : ce qu'on voit, le point à corriger… ou dicte-le avec le micro" value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
                  <div className="flex flex-wrap items-center gap-2">
                    {dictation.supported ? (
                      <button
                        type="button"
                        onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
                        disabled={busy}
                        className="btn-secondary"
                        style={dictation.listening ? { background: "#e5484d", color: "#fff", borderColor: "#e5484d" } : undefined}
                        aria-pressed={dictation.listening}
                      >
                        {dictation.listening ? "■ Arrêter la dictée" : "🎤 Dicter le commentaire"}
                      </button>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                        Dictée vocale indisponible sur ce navigateur (Chrome, Edge ou Safari).
                      </span>
                    )}
                    {dictation.listening && (
                      <span className="flex items-center gap-2 text-xs" style={{ color: "var(--text-faint)" }} aria-live="polite">
                        <span className="inline-block h-2 w-20 overflow-hidden rounded" style={{ background: "var(--border)" }} title="Niveau du micro : la barre doit bouger quand tu parles">
                          <i className="block h-full rounded" style={{ width: `${Math.round(dictation.level * 100)}%`, background: dictation.level > 0.05 ? "#3BD16F" : "var(--text-faint)" }} />
                        </span>
                        {dictation.level <= 0.05 ? "Aucun son capté…" : dictation.heard ? "Texte reconnu ✓" : "Son capté, reconnaissance en cours…"}
                      </span>
                    )}
                    {dictation.error && <span className="text-xs" style={{ color: "#f87171" }}>{dictation.error}</span>}
                  </div>
                </div>
                {trainings && (
                  <label className="label">
                    Séance
                    <select className="input mt-1 w-full" value={training} onChange={(e) => setTraining(e.target.value)}>
                      <option value="">— Aucune séance —</option>
                      {trainings.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </label>
                )}
                {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn-secondary" onClick={close} disabled={busy}>Annuler</button>
                  <button className="btn-primary" disabled={busy || !file}>
                    {busy ? "Envoi en cours…" : "Ajouter la vidéo"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Liste de vidéos d'un joueur (miniature, titre, lien vers le lecteur). */
export function PlayerClipList({
  clips,
  canManage,
  showTraining = false,
}: {
  clips: PlayerClip[];
  canManage: boolean;
  showTraining?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  if (clips.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {clips.map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-lg p-2" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <Link href={`/videos/clip/${c.id}`} className="relative h-12 w-20 shrink-0 overflow-hidden rounded bg-black" aria-label={`Voir ${c.title}`}>
              {c.thumbUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.thumbUrl} alt="" className="h-full w-full object-cover opacity-80" />
              )}
              <span className="absolute inset-0 flex items-center justify-center text-lg text-white">▶</span>
            </Link>
            <div className="min-w-0 flex-1 text-xs">
              <Link href={`/videos/clip/${c.id}`} className="block truncate text-sm font-medium">{c.title}</Link>
              <span className="block truncate" style={{ color: "var(--text-faint)" }}>
                {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                {showTraining && c.trainingLabel ? ` · ${c.trainingLabel}` : ""}
              </span>
              {c.note && <span className="line-clamp-1">{c.note}</span>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
              {canManage && (
                <Link href={`/videos/editeur/${c.sourceId}?clip=${c.id}`} style={{ color: "var(--brand)" }}>Annoter</Link>
              )}
              {canManage && (
                <button
                  type="button"
                  disabled={pending}
                  style={{ color: "#f87171" }}
                  onClick={() => {
                    if (!confirm(`Supprimer la vidéo « ${c.title} » ?`)) return;
                    startTransition(async () => {
                      const r = await deletePlayerVideo(c.id);
                      if (r.error) setError(r.error);
                      else router.refresh();
                    });
                  }}
                >
                  🗑
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
