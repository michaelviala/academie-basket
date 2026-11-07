import { COLORS, DIMS, THEMES, type Court, type Theme, type WbEl } from "@/lib/whiteboard";

/** Lignes du terrain (FIBA), dans le repère du terrain : 1 unité = 10 cm. */
export function CourtLines({ court, theme }: { court: Court; theme: Theme }) {
  const t = THEMES[theme];
  const { w, h } = DIMS[court];
  const s = { stroke: t.line, fill: "none", strokeWidth: 0.7 };
  if (court === "half")
    return (
      <g>
        <rect x={0} y={0} width={w} height={h} fill={t.floor} stroke={t.line} strokeWidth={0.7} />
        <rect x={50.5} y={0} width={49} height={58} {...s} fill={t.paint} />
        <path d="M57 58 A18 18 0 0 1 93 58" {...s} />
        <path d="M57 58 A18 18 0 0 0 93 58" {...s} strokeDasharray="2.5 2.5" />
        <path d="M9 0 V29.9 A67.5 67.5 0 0 0 141 29.9 V0" {...s} />
        <path d="M62.5 15.75 A12.5 12.5 0 0 0 87.5 15.75" {...s} />
        <path d="M57 140 A18 18 0 0 1 93 140" {...s} />
        <path d="M69 11.5 H81" stroke={t.line} strokeWidth={1.2} />
        <circle cx={75} cy={15.75} r={2.3} fill="none" stroke="#e8590c" strokeWidth={0.9} />
      </g>
    );
  const side = (
    <g>
      <rect x={0} y={50.5} width={58} height={49} {...s} fill={t.paint} />
      <path d="M58 57 A18 18 0 0 1 58 93" {...s} />
      <path d="M58 57 A18 18 0 0 0 58 93" {...s} strokeDasharray="2.5 2.5" />
      <path d="M0 9 H29.9 A67.5 67.5 0 0 1 29.9 141 H0" {...s} />
      <path d="M15.75 62.5 A12.5 12.5 0 0 1 15.75 87.5" {...s} />
      <path d="M12 69 V81" stroke={t.line} strokeWidth={1.2} />
      <circle cx={15.75} cy={75} r={2.3} fill="none" stroke="#e8590c" strokeWidth={0.9} />
    </g>
  );
  return (
    <g>
      <rect x={0} y={0} width={w} height={h} fill={t.floor} stroke={t.line} strokeWidth={0.7} />
      <path d="M140 0 V150" {...s} />
      <circle cx={140} cy={75} r={18} {...s} />
      {side}
      <g transform="translate(280 0) scale(-1 1)">{side}</g>
    </g>
  );
}

/** Pointes de flèche, une par couleur (identifiants préfixés pour éviter les collisions entre plusieurs tableaux). */
export function ArrowDefs({ uid }: { uid: string }) {
  return (
    <defs>
      {COLORS.map((c) => (
        <marker key={c} id={`${uid}${c.slice(1)}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill={c} />
        </marker>
      ))}
    </defs>
  );
}

function zigzag(a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const steps = Math.max(2, Math.floor(len / 4));
  const pts: string[] = [`${a[0]},${a[1]}`];
  for (let i = 1; i < steps; i++) {
    const d = (i / steps) * len;
    const o = i % 2 ? 1.6 : -1.6;
    pts.push(`${(a[0] + ux * d - uy * o).toFixed(1)},${(a[1] + uy * d + ux * o).toFixed(1)}`);
  }
  pts.push(`${b[0]},${b[1]}`);
  return pts.join(" ");
}

export function renderElement(e: WbEl, theme: Theme, uid: string, selected = false) {
  const t = THEMES[theme];
  const glow = selected ? { filter: "drop-shadow(0 0 1.6px #3ba7ff) drop-shadow(0 0 1.6px #3ba7ff)" } : undefined;
  const mk = (c: string) => `url(#${uid}${c.slice(1)})`;
  switch (e.k) {
    case "att":
    case "def": {
      const att = e.k === "att";
      return (
        <g key={e.id} data-id={e.id} style={glow} fontFamily="Figtree, sans-serif" textAnchor="middle">
          <circle cx={e.x} cy={e.y} r={4.6} fill={att ? "#e5171b" : t.defFill} stroke={att ? "#ffffff" : t.defStroke} strokeWidth={0.9} />
          <text x={e.x} y={e.y + 1.7} fontSize={e.n.length > 1 ? 4 : 4.8} fontWeight={700} fill={att ? "#ffffff" : t.defText}>
            {att ? e.n : `X${e.n}`.replace(/^XX/, "X")}
          </text>
        </g>
      );
    }
    case "ball":
      return (
        <g key={e.id} data-id={e.id} style={glow}>
          <circle cx={e.x} cy={e.y} r={2.7} fill="#ff8a00" stroke="#1a1208" strokeWidth={0.5} />
          <path d={`M${e.x - 2.7} ${e.y} H${e.x + 2.7} M${e.x} ${e.y - 2.7} V${e.y + 2.7}`} stroke="#1a1208" strokeWidth={0.3} />
        </g>
      );
    case "cone":
      return (
        <g key={e.id} data-id={e.id} style={glow}>
          <path d={`M${e.x} ${e.y - 3.2} L${e.x + 3} ${e.y + 2.6} H${e.x - 3} Z`} fill="#ffd23f" stroke="#1a1208" strokeWidth={0.5} />
        </g>
      );
    case "line": {
      const { a, b, c, s } = e;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const ux = (b[0] - a[0]) / len;
      const uy = (b[1] - a[1]) / len;
      return (
        <g key={e.id} data-id={e.id} style={glow} fill="none" stroke={c} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
          {s === "move" && <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} markerEnd={mk(c)} />}
          {s === "pass" && <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeDasharray="3 2.4" markerEnd={mk(c)} />}
          {s === "dribble" && <polyline points={zigzag(a, b)} markerEnd={mk(c)} />}
          {s === "screen" && (
            <>
              <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
              <line x1={b[0] - uy * 3.6} y1={b[1] + ux * 3.6} x2={b[0] + uy * 3.6} y2={b[1] - ux * 3.6} strokeWidth={1.8} />
            </>
          )}
          {/* zone de saisie plus large pour attraper facilement la ligne */}
          <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="transparent" strokeWidth={6} />
        </g>
      );
    }
    case "pen":
      return (
        <g key={e.id} data-id={e.id} style={glow} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <polyline points={e.pts.map((p) => p.join(",")).join(" ")} stroke={e.c} strokeWidth={1.3} />
          <polyline points={e.pts.map((p) => p.join(",")).join(" ")} stroke="transparent" strokeWidth={5} />
        </g>
      );
    case "zone":
      return (
        <g key={e.id} data-id={e.id} style={glow}>
          <ellipse cx={e.x} cy={e.y} rx={e.rx} ry={e.ry} fill={e.c} fillOpacity={0.14} stroke={e.c} strokeWidth={1} strokeDasharray="3 2.4" />
        </g>
      );
    case "text":
      return (
        <g key={e.id} data-id={e.id} style={glow}>
          <text x={e.x} y={e.y} fontFamily="Figtree, sans-serif" fontSize={5.2} fontWeight={700} fill={e.c} stroke={e.c === "#111111" ? "#ffffff" : "rgba(0,0,0,.45)"} strokeWidth={0.7} paintOrder="stroke">
            {e.txt}
          </text>
        </g>
      );
  }
}

/** Aperçu non interactif (liste des tableaux, lecture seule). */
export function WbStatic({ court, theme, els, uid, label }: { court: Court; theme: Theme; els: WbEl[]; uid: string; label: string }) {
  const { w, h } = DIMS[court];
  return (
    <svg viewBox={`-6 -6 ${w + 12} ${h + 12}`} style={{ display: "block", width: "100%", height: "auto" }} role="img" aria-label={label}>
      <rect x={-6} y={-6} width={w + 12} height={h + 12} fill={THEMES[theme].out} />
      <ArrowDefs uid={uid} />
      <CourtLines court={court} theme={theme} />
      {els.map((e) => renderElement(e, theme, uid))}
    </svg>
  );
}
