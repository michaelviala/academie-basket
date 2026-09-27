"use client";

import { useRef, useState, useTransition } from "react";
import { uploadPlayerPhoto, removePlayerPhoto } from "@/app/(app)/joueurs/[id]/actions";

export function PlayerPhoto({
  playerId,
  initialPhotoUrl,
  initials,
}: {
  playerId: string;
  initialPhotoUrl: string | null;
  initials: string;
}) {
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const preview = URL.createObjectURL(file);
    setPhotoUrl(preview);

    const fd = new FormData();
    fd.set("photo", file);
    startTransition(async () => {
      const result = await uploadPlayerPhoto(playerId, fd);
      if (result?.error) {
        setError(result.error);
        setPhotoUrl(initialPhotoUrl);
      } else if (result?.url) {
        setPhotoUrl(result.url);
      }
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removePlayerPhoto(playerId);
      if (result?.error) setError(result.error);
      else setPhotoUrl(null);
    });
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isPending}
        className="group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-2xl font-bold"
        style={{ background: "var(--surf-2)", border: "2px solid var(--border)", color: "var(--text-dim)" }}
        title="Changer la photo"
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
        <span
          className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold opacity-0 transition-opacity group-hover:opacity-100"
          style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
        >
          {isPending ? "…" : "Changer"}
        </span>
      </button>
      {photoUrl && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          className="text-[11px]"
          style={{ color: "#f87171" }}
        >
          Retirer
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && (
        <p className="text-[11px]" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}
    </div>
  );
}
