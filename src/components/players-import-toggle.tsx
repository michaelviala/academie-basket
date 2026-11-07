"use client";

import { useState } from "react";
import { ImportPlayers } from "@/components/import-players";

export function PlayersImportToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      {!open && (
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>⤒ Importer un fichier Excel / CSV</button>
      )}
      {open && <ImportPlayers onClose={() => setOpen(false)} />}
      {children}
    </div>
  );
}
