/** Phases de jeu et résultats des clips (repris de PIVOT). */

export const PHASES = [
  { id: "att", label: "Attaque placée", color: "#ff7a3d", kind: "off" },
  { id: "tra", label: "Transition", color: "#3fb950", kind: "mix" },
  { id: "rem", label: "Remise en jeu", color: "#c9a3ff", kind: "off" },
  { id: "reb", label: "Rebond", color: "#e8b84f", kind: "mix" },
  { id: "def", label: "Défense", color: "#5aa9ff", kind: "def" },
  { id: "oth", label: "Autre", color: "#8a8f99", kind: "mix" },
] as const;

export const RESULTS = [
  { id: "p2", label: "Panier 2 pts", kind: "off" },
  { id: "p3", label: "Panier 3 pts", kind: "off" },
  { id: "lf", label: "Lancers francs", kind: "off" },
  { id: "m2", label: "Tir 2 pts manqué", kind: "off" },
  { id: "m3", label: "Tir 3 pts manqué", kind: "off" },
  { id: "to", label: "Perte de balle", kind: "off" },
  { id: "fp", label: "Faute provoquée", kind: "both" },
  { id: "stop", label: "Stop défensif", kind: "def" },
  { id: "enc", label: "Panier encaissé", kind: "def" },
] as const;

export const phaseOf = (id: string | null | undefined) =>
  PHASES.find((p) => p.id === id) ?? PHASES[PHASES.length - 1];

/** Résultats proposés selon la phase : en défense, pas de paniers marqués ni de tirs. */
export function resultsFor(phase: string) {
  const k = phaseOf(phase).kind;
  return k === "mix"
    ? RESULTS
    : RESULTS.filter((r) => r.kind === k || r.kind === "both");
}

export function resultOk(phase: string, result: string | null) {
  return !result || resultsFor(phase).some((r) => r.id === result);
}

export type ClipComment = { t: number; text: string; audio?: string };
export const AUDIO_PATH = /^audio\/[0-9a-f-]{36}\.(webm|ogg|m4a)$/;

export function parseComments(raw: unknown): ClipComment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => c as Partial<ClipComment>)
    .filter((c) => typeof c.t === "number" && typeof c.text === "string")
    .map((c) => {
      const out: ClipComment = { t: c.t as number, text: c.text as string };
      if (typeof c.audio === "string" && AUDIO_PATH.test(c.audio)) out.audio = c.audio;
      return out;
    });
}
