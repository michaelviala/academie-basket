"use client";

import { useRef, useState, useTransition } from "react";
import {
  uploadPlayerPhoto,
  removePlayerPhoto,
} from "@/app/(app)/joueurs/[id]/actions";

/** Réduit la photo (portrait carré 800 px max, JPEG) : une photo de téléphone pèse 3 à 8 Mo. */
async function compressImage(file: File, max = 800): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const side = Math.min(bitmap.width, bitmap.height);
    const out = Math.min(side, max);
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // recadrage carré centré (légèrement vers le haut, pour garder le visage)
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) * 0.3;
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, out, out);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", 0.85),
    );
    if (!blob) return file;
    return new File([blob], "portrait.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function PlayerPhoto({
  playerId,
  initialPhotoUrl,
  initials,
  size = 64,
  ringColor,
}: {
  playerId: string;
  initialPhotoUrl: string | null;
  initials: string;
  size?: number;
  ringColor?: string;
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

    startTransition(async () => {
      const fd = new FormData();
      fd.set("photo", await compressImage(file));
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
      <div className="relative">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          className="group relative flex items-center justify-center overflow-hidden rounded-full font-bold"
          style={{
            width: size,
            height: size,
            fontSize: size * 0.34,
            background: "var(--surf-2)",
            border: `3px solid ${ringColor ?? "var(--border)"}`,
            color: "var(--text-dim)",
          }}
          title="Prendre ou changer la photo"
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
        <span
          className="absolute bottom-0 right-0 flex items-center justify-center rounded-full"
          style={{
            width: size * 0.3,
            height: size * 0.3,
            background: "var(--brand)",
            color: "#fff",
            fontSize: size * 0.15,
          }}
          aria-hidden
        >
          {isPending ? "…" : "📷"}
        </span>
      </div>
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
