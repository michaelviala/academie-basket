"use client";

import { useId, useRef } from "react";
import {
  clampPos,
  curveControl,
  holderBall,
  tokenKind,
  type Pt,
  type TokenPosition,
} from "@/lib/systems";

/** Demi-terrain FIBA (panier en haut) dessiné dans un repère 100 × 100. */
function CourtLines() {
  const line = {
    stroke: "#fff",
    fill: "none",
    vectorEffect: "non-scaling-stroke" as const,
    strokeWidth: 1.6,
  };
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <rect width="100" height="100" fill="#e8d0a8" />
      <rect x="33.7" y="0" width="32.6" height="41.4" fill="#c9672f" />
      <g {...line}>
        <rect x="0.5" y="0.5" width="99" height="99" />
        <rect x="33.7" y="0" width="32.6" height="41.4" />
        <path d="M38 41.4 A12 12.9 0 0 1 62 41.4" />
        <path d="M38 41.4 A12 12.9 0 0 0 62 41.4" strokeDasharray="3 3" />
        <path d="M6 0 L6 21.4 A45 48.2 0 0 0 94 21.4 L94 0" />
        <path d="M41.7 11.25 A8.3 8.9 0 0 0 58.3 11.25" />
        <path d="M38 100 A12 12.9 0 0 1 62 100" />
        <line x1="44" y1="8.6" x2="56" y2="8.6" />
        <ellipse cx="50" cy="11.25" rx="1.5" ry="1.6" />
      </g>
    </svg>
  );
}

const SIZE = 8.4; // diamètre d'un jeton, en % de la largeur

export function SystemCourt({
  positions,
  ball,
  previous,
  segment,
  pass,
  curve = true,
  mode = "none",
  selected = null,
  onSelect,
  onMove,
  onCommit,
  onTap,
  mini = false,
}: {
  positions: TokenPosition[];
  /** Ballon : point précis, null = aucun, undefined = suit le porteur. */
  ball?: Pt | null;
  /** Séquence précédente : dessine les flèches de déplacement. */
  previous?: TokenPosition[] | null;
  /** Transition en cours de lecture : trajectoires pleines + cercles fantômes aux arrivées. */
  segment?: { from: TokenPosition[]; to: TokenPosition[] } | null;
  /** Passe à matérialiser (de l'ancien porteur au nouveau). */
  pass?: { from: Pt; to: Pt } | null;
  curve?: boolean;
  /** move = glisser les jetons, tap = cliquer un jeton (outils Ballon / Écran). */
  mode?: "none" | "move" | "tap";
  selected?: string | null;
  onSelect?: (label: string | null) => void;
  onMove?: (label: string, x: number, y: number) => void;
  onCommit?: () => void;
  onTap?: (label: string) => void;
  mini?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef<string | null>(null);
  const markerId = useId().replace(/:/g, "");

  function toPercent(e: React.PointerEvent) {
    const r = ref.current!.getBoundingClientRect();
    return {
      x: clampPos(((e.clientX - r.left) / r.width) * 100),
      y: clampPos(((e.clientY - r.top) / r.height) * 100),
    };
  }

  const ballPt = ball === undefined ? holderBall(positions) : ball;
  const trailFrom = segment?.from ?? previous ?? null;
  const trailTo = segment?.to ?? positions;
  const prevMap = new Map((trailFrom ?? []).map((p) => [p.label, p]));
  const arrows = trailTo.filter((p) => {
    const a = prevMap.get(p.label);
    return a && Math.hypot(a.x - p.x, a.y - p.y) > 2;
  });
  const screens = positions.filter((p) => p.screen);
  const screenMark = (p: TokenPosition) => {
    const a = prevMap.get(p.label);
    let dx = 0;
    let dy = 1;
    if (a && Math.hypot(p.x - a.x, p.y - a.y) > 2) {
      const len = Math.hypot(p.x - a.x, p.y - a.y);
      dx = (p.x - a.x) / len;
      dy = (p.y - a.y) / len;
    }
    const s0 = { x: p.x + dx * SIZE * 0.5, y: p.y + dy * SIZE * 0.5 };
    const s1 = { x: p.x + dx * (SIZE * 0.5 + 4.5), y: p.y + dy * (SIZE * 0.5 + 4.5) };
    return { s0, s1, bar: { x: -dy * 3.6, y: dx * 3.6 } };
  };
  const shorten = (a: Pt, b: Pt): Pt => {
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const k = Math.max(0, (len - SIZE * 0.55) / len);
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  };

  return (
    <div
      ref={ref}
      className="relative w-full select-none overflow-hidden rounded-lg"
      style={{
        aspectRatio: "15 / 14",
        containerType: "inline-size",
        touchAction: mode === "move" ? "none" : "auto",
      }}
      onPointerDown={(e) => {
        if (mode !== "none" && e.target === e.currentTarget) onSelect?.(null);
      }}
    >
      <CourtLines />

      {!mini && (arrows.length > 0 || pass || screens.length > 0) && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M0 0 L10 5 L0 10 z" fill="#14171c" />
            </marker>
            <marker id={`${markerId}p`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M0 0 L10 5 L0 10 z" fill="#ff7a3d" />
            </marker>
          </defs>
          {arrows.map((p) => {
            const a = prevMap.get(p.label)!;
            const end = shorten(curve ? curveControl(a, p) : a, p);
            const d = curve
              ? `M${a.x} ${a.y} Q${curveControl(a, p).x} ${curveControl(a, p).y} ${end.x} ${end.y}`
              : `M${a.x} ${a.y} L${end.x} ${end.y}`;
            return (
              <path
                key={p.label}
                d={d}
                fill="none"
                stroke="#14171c"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                markerEnd={`url(#${markerId})`}
              />
            );
          })}
          {pass && (
            <line
              x1={pass.from.x}
              y1={pass.from.y}
              x2={shorten(pass.from, pass.to).x}
              y2={shorten(pass.from, pass.to).y}
              stroke="#14171c"
              strokeWidth={2}
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
              markerEnd={`url(#${markerId})`}
            />
          )}
          {screens.map((p) => {
            const m = screenMark(p);
            return (
              <g key={`s-${p.label}`} stroke="#14171c" strokeWidth={2.6} strokeLinecap="round" vectorEffect="non-scaling-stroke">
                <line x1={m.s0.x} y1={m.s0.y} x2={m.s1.x} y2={m.s1.y} vectorEffect="non-scaling-stroke" />
                <line x1={m.s1.x - m.bar.x} y1={m.s1.y - m.bar.y} x2={m.s1.x + m.bar.x} y2={m.s1.y + m.bar.y} vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}
        </svg>
      )}

      {!mini &&
        segment &&
        arrows.map((p) => (
          <div
            key={`g-${p.label}`}
            aria-hidden
            className="pointer-events-none absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${SIZE}%`,
              aspectRatio: "1",
              transform: "translate(-50%, -50%)",
              border: "0.35cqw dashed #14171c",
              zIndex: 2,
            }}
          />
        ))}

      {positions.map((p) => {
        const kind = tokenKind(p.label);
        const isSel = selected === p.label;
        return (
          <div
            key={p.label}
            onPointerDown={(e) => {
              if (mode === "none") return;
              e.stopPropagation();
              onSelect?.(p.label);
              if (mode === "tap") return onTap?.(p.label);
              dragging.current = p.label;
              e.currentTarget.setPointerCapture(e.pointerId);
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
              width: `${SIZE}%`,
              aspectRatio: "1",
              transform: "translate(-50%, -50%)",
              fontSize: mini ? "3.6cqw" : "3.8cqw",
              cursor: mode === "move" ? "grab" : mode === "tap" ? "pointer" : "default",
              background: "#10151b",
              color: kind === "defense" ? "#ff6b6b" : "#fff",
              border: `0.7cqw solid ${kind === "defense" ? "#ff6b6b" : "var(--brand, #ff7a3d)"}`,
              boxShadow: isSel
                ? "0 0 0 0.9cqw rgba(20,23,28,.35)"
                : "0 1px 3px rgba(0,0,0,.4)",
              zIndex: isSel ? 4 : 3,
            }}
          >
            {p.label}
          </div>
        );
      })}

      {ballPt && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            left: `${ballPt.x}%`,
            top: `${ballPt.y}%`,
            width: `${SIZE * 0.52}%`,
            aspectRatio: "1",
            transform: "translate(-50%, -50%)",
            background: "#f26a1b",
            border: "0.45cqw solid #7a2f0c",
            zIndex: 5,
          }}
        />
      )}
    </div>
  );
}
