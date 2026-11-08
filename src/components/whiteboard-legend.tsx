"use client";

import { useEffect, useId, type ReactNode } from "react";
import { ArrowDefs, renderElement } from "@/components/whiteboard-scene";
import { THEMES, type Theme, type WbEl } from "@/lib/whiteboard";

type Row = { group: string; name: string; meaning: string; how: string; sample: ReactNode };

const RED = "#e5171b";
const BLUE = "#3ba7ff";

/** Vignette : dessine un ou plusieurs éléments avec le rendu réel du tableau. */
function Sample({ els, theme, uid, vb = "0 0 40 20" }: { els: WbEl[]; theme: Theme; uid: string; vb?: string }) {
  return (
    <svg viewBox={vb} width={96} height={48} role="img" aria-hidden="true" style={{ display: "block" }}>
      <rect x={-50} y={-50} width={300} height={300} fill={THEMES[theme].floor} />
      <ArrowDefs uid={uid} />
      {els.map((e) => renderElement(e, theme, uid))}
    </svg>
  );
}

export function WhiteboardLegend({ theme, onClose }: { theme: Theme; onClose: () => void }) {
  const uid = `lg${useId().replace(/\W/g, "")}-`;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const S = (els: WbEl[], vb?: string) => <Sample els={els} theme={theme} uid={uid} vb={vb} />;
  const line = (s: "move" | "pass" | "dribble" | "screen", c = RED): WbEl => ({ id: "l", k: "line", s, c, a: [4, 10], b: [34, 10] });

  const rows: Row[] = [
    { group: "Pièces", name: "Attaquant", meaning: "Joueur en attaque (rouge, numéroté 1, 2, 3…)", how: "Outil Attaquant, puis toucher le terrain. Le numéro se change dans « Numéro ».", sample: S([{ id: "a", k: "att", n: "1", x: 20, y: 10 }]) },
    { group: "Pièces", name: "Défenseur", meaning: "Joueur en défense (blanc, noté X1, X2…)", how: "Outil Défenseur, puis toucher le terrain.", sample: S([{ id: "d", k: "def", n: "1", x: 20, y: 10 }]) },
    { group: "Pièces", name: "Ballon", meaning: "Position du ballon", how: "Outil Ballon, puis toucher le terrain.", sample: S([{ id: "b", k: "ball", x: 20, y: 10 }]) },
    { group: "Pièces", name: "Plot", meaning: "Repère d'exercice (couleur au choix)", how: "Choisir une couleur, outil Plot, puis toucher le terrain.", sample: S([{ id: "c1", k: "cone", c: "#ff8a00", x: 12, y: 10 }, { id: "c2", k: "cone", c: BLUE, x: 28, y: 10 }]) },
    { group: "Traits", name: "Trajet (flèche pleine)", meaning: "Déplacement d'un joueur sans ballon", how: "Outil Trajet, glisser du départ à l'arrivée.", sample: S([line("move")]) },
    { group: "Traits", name: "Passe (flèche pointillée)", meaning: "Passe du ballon", how: "Outil Passe, glisser du passeur au receveur.", sample: S([line("pass")]) },
    { group: "Traits", name: "Dribble (flèche en zigzag)", meaning: "Déplacement avec le ballon", how: "Outil Dribble, glisser du départ à l'arrivée.", sample: S([line("dribble")]) },
    { group: "Traits", name: "Écran (trait avec barre)", meaning: "Écran posé pour un partenaire", how: "Outil Écran, glisser vers l'endroit où l'écran est posé.", sample: S([line("screen")]) },
    { group: "Traits", name: "Crayon", meaning: "Tracé libre à main levée", how: "Outil Crayon, dessiner en gardant le doigt appuyé.", sample: S([{ id: "p", k: "pen", c: "#ffd23f", pts: [[4, 14], [10, 6], [16, 14], [22, 6], [28, 14], [35, 8]] }]) },
    { group: "Annoter", name: "Zone", meaning: "Espace à occuper ou à défendre", how: "Outil Zone, glisser pour tracer l'ovale.", sample: S([{ id: "z", k: "zone", c: "#3bd16f", x: 20, y: 10, rx: 16, ry: 7 }]) },
    { group: "Annoter", name: "Texte", meaning: "Mot ou consigne écrite sur le terrain", how: "Outil Texte, toucher le terrain, écrire puis Entrée.", sample: S([{ id: "t", k: "text", c: "#ffd23f", x: 6, y: 13, txt: "Écran" }]) },
    { group: "Annoter", name: "Gomme", meaning: "Efface un élément", how: "Outil Gomme, toucher l'élément à effacer.", sample: <span className="text-2xl" aria-hidden="true">⌫</span> },
    { group: "Utiliser", name: "Déplacer", meaning: "Déplace ou sélectionne un élément", how: "Outil Déplacer, glisser l'élément. « Supprimer » ou la touche Suppr l'enlève.", sample: <span className="text-2xl" aria-hidden="true">✥</span> },
    { group: "Utiliser", name: "Laser", meaning: "Pointeur rouge à traînée pour montrer sans rien modifier", how: "Outil Laser ou touche L, puis glisser le doigt ou la souris.", sample: <span className="text-2xl" aria-hidden="true">🔴</span> },
  ];

  const groups = [...new Set(rows.map((r) => r.group))];
  const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-3" role="dialog" aria-modal="true" aria-label="Légende du tableau blanc" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-4xl overflow-y-auto !p-0" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surf-1, var(--surface, #17181d))" }}>
          <b className="display text-lg">Légende du tableau blanc</b>
          <div className="flex-1" />
          <button type="button" className="btn-secondary" onClick={onClose}>✕ Fermer</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead style={{ color: "var(--text-faint)" }}>
              <tr>
                <th className={th}>Aspect</th>
                <th className={th}>Élément</th>
                <th className={th}>Signification</th>
                <th className={th}>Comment l&apos;ajouter</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <GroupRows key={g} group={g} rows={rows.filter((r) => r.group === g)} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t px-4 py-3 text-xs" style={{ borderColor: "var(--border)", color: "var(--text-faint)" }}>
          Couleurs disponibles pour les traits, plots, zones et textes : jaune, orange, blanc, rouge, bleu, vert, noir. Sur un tableau déjà posé, on peut déplacer n&apos;importe quel élément avec l&apos;outil Déplacer.
        </p>
      </div>
    </div>
  );
}

function GroupRows({ group, rows }: { group: string; rows: Row[] }) {
  return (
    <>
      <tr>
        <td colSpan={4} className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--brand)" }}>{group}</td>
      </tr>
      {rows.map((r) => (
        <tr key={r.name} className="border-t align-middle" style={{ borderColor: "var(--border)" }}>
          <td className="px-3 py-2"><div className="flex h-12 w-24 items-center justify-center overflow-hidden rounded-md">{r.sample}</div></td>
          <td className="px-3 py-2 font-semibold">{r.name}</td>
          <td className="px-3 py-2">{r.meaning}</td>
          <td className="px-3 py-2" style={{ color: "var(--text-faint)" }}>{r.how}</td>
        </tr>
      ))}
    </>
  );
}
