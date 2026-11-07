"use client";

import { useRef } from "react";
import {
  clampPos,
  tokenKind,
  type TokenPosition,
} from "@/lib/systems";

/** Demi-terrain FIBA (panier en haut) dessiné dans un repère 100 × 100. */
function CourtLines() {
  const line = {
    stroke: "var(--court-line, rgba(255,255,255,.75))",
    strokeWidth: 0.55,
    fill: "none",
    vectorEffect: "non-scaling-stroke" as const,
  };
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <rect x="0" y="0" width="100" height="100" fill="var(--court-floor, #b5793c)" />
      <rect x="33.7" y="0" width="32.6" height="41.4" fill="var(--court-key, rgba(0,0,0,.14))" />
      <g {...line} strokeWidth={1.4}>
        <rect x="0.4" y="0.4" width="99.2" height="99.2" />
        <rect x="33.7" y="0" width="32.6" height="41.4" />
        <path d="M38 41.4 A12 12.9 0 0 1 62 41.4" />
        <path d="M38 41.4 A12 12.9 0 0 0 62 41.4" strokeDasharray="3 3" />
        <path d="M6 0 L6 21.4 A45 48.2 0 0 0 94 21.4 L94 0" />
        <path d="M41.7 11.25 A8.3 8.9 0 0 0 58.3 11.25" />
        <line x1="44" y1="8.6" x2="56" y2="8.6" />
        <ellipse cx="50" cy="11.25" rx="1.5" ry="1.6" stroke="#ff7a3d" />
      </g>
    </svg>
  );
}

const SIZE = 8.4; // diamètre d'un jeton, en % de la largeur

export function SystemCourt({
  positions,
  previous,
  editable = false,
  selected = null,
  onSelect,
  onMove,
  onCommit,
  mini = false,
}: {
  positions: TokenPosition[];
  /** Séquence précédente : dessine les flèches de déplacement. */
  previous?: TokenPosition[] | null;
  editable?: boolean;
  selected?: string | null;
  onSelect?: (label: string | null) => void;
  onMove?: (label: string, x: number, y: number) => void;
  onCommit?: () => void;
  mini?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef<string | null>(null);

  function toPercent(e: React.PointerEvent) {
    const r = ref.current!.getBoundingClientRect();
    return {
      x: clampPos(((e.clientX - r.left) / r.width) * 100),
      y: clampPos(((e.clientY - r.top) / r.height) * 100),
    };
  }

  const prevMap = new Map((previous ?? []).map((p) => [p.label, p]));
  const arrows = positions.filter((p) => {
    const a = prevMap.get(p.label);
    return a && Math.hypot(a.x - p.x, a.y - p.y) > 2;
  });

  return (
    <div
      ref={ref}
      className="relative w-full select-none overflow-hidden rounded-xl"
      style={{
        aspectRatio: "15 / 14",
        containerType: "inline-size",
        touchAction: editable ? "none" : "auto",
      }}
      onPointerDown={(e) => {
        if (editable && e.target === e.currentTarget) onSelect?.(null);
      }}
    >
      <CourtLines />

      {!mini && arrows.length > 0 && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="rgba(255,255,255,.9)" />
            </marker>
          </defs>
          {arrows.map((p) => {
            const a = prevMap.get(p.label)!;
            // raccourcit la flèche pour qu'elle s'arrête au bord du jeton
            const dx = p.x - a.x;
            const dy = p.y - a.y;
            const len = Math.hypot(dx, dy);
            const k = Math.max(0, (len - SIZE * 0.55) / len);
            return (
              <line
                key={p.label}
                x1={a.x}
                y1={a.y}
                x2={a.x + dx * k}
                y2={a.y + dy * k}
                stroke="rgba(255,255,255,.85)"
                strokeWidth={1.6}
                strokeDasharray="4 3"
                vectorEffect="non-scaling-stroke"
                markerEnd="url(#arr)"
              />
            );
          })}
        </svg>
      )}

      {positions.map((p) => {
        const kind = tokenKind(p.label);
        const isSel = selected === p.label;
        const size = kind === "ball" ? SIZE * 0.62 : SIZE;
        return (
          <div
            key={p.label}
            onPointerDown={(e) => {
              if (!editable) return;
              e.stopPropagation();
              dragging.current = p.label;
              e.currentTarget.setPointerCapture(e.pointerId);
              onSelect?.(p.label);
            }}
            onPointerMove={(e) => {
              if (dragging.current !== p.label) return;
              const { x, y } = toPercent(e);
              onMove?.(p.label, x, y);
            }}
            onPointerUp={() => {
              if (dragging.current === p.label) {
                dragging.current = null;
                onCommit?.();
              }
            }}
            className="absolute flex items-center justify-center rounded-full font-bold"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${size}%`,
              aspectRatio: "1",
              transform: "translate(-50%, -50%)",
              fontSize: mini ? "3.2cqw" : "3.6cqw",
              cursor: editable ? "grab" : "default",
              background:
                kind === "ball"
                  ? "#f7d23e"
                  : kind === "defense"
                    ? "#1b1d23"
                    : "#2f6fe4",
              color: kind === "defense" ? "#ff6b6b" : "#fff",
              border:
                kind === "defense"
                  ? "0.5cqw solid #ff6b6b"
                  : kind === "ball"
                    ? "0.4cqw solid #8a6d00"
                    : "0.5cqw solid rgba(255,255,255,.9)",
              boxShadow: isSel
                ? "0 0 0 0.9cqw rgba(255,255,255,.55)"
                : "0 1px 3px rgba(0,0,0,.45)",
              zIndex: isSel ? 3 : 2,
            }}
          >
            {kind === "ball" ? "" : p.label}
          </div>
        );
      })}
    </div>
  );
}
