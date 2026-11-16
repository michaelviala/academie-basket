"use client";

import { useState } from "react";
import { ImportPlayers } from "@/components/import-players";

/** Bouton « Importer un fichier Excel » de la page Joueurs : ouvre l'import dans une fenêtre. */
export function PlayersImportButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>⤒ Importer un fichier Excel</button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:p-6"
          style={{ background: "rgba(0,0,0,.7)" }}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Importer des joueurs depuis un fichier Excel"
        >
          <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <ImportPlayers onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
