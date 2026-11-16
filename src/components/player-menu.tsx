"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePlayerMeasures } from "@/app/(app)/joueurs/[id]/actions";

export type GuardianContact = {
  id: string;
  full_name: string;
  relationship: string;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
};

type Props = {
  playerId: string;
  /** Mesures et parents réservés à l'encadrement. */
  staff: boolean;
  canAddGuardians: boolean;
  guardians: GuardianContact[];
  height: number | null;
  weight: number | null;
  wingspan: number | null;
  hand: string | null;
  previousClub: string | null;
};

const REL: Record<string, string> = { mere: "Mère", pere: "Père", tuteur: "Tuteur" };

/** Menu « roue dentée » de la fiche joueur : nouvelle mesure, contacts parents, bilan PDF. */
export function PlayerMenu({ playerId, staff, canAddGuardians, guardians, height, weight, wingspan, hand, previousClub }: Props) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"mesure" | "parents" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setPanel(null); } };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const item = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surf-2)]";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="btn-secondary"
        style={{ padding: "6px 10px" }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Actions sur la fiche"
        title="Actions sur la fiche"
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl py-1 shadow-xl"
          style={{ background: "var(--surf)", border: "1px solid var(--border)" }}
        >
          {staff && (
            <button type="button" role="menuitem" className={item} onClick={() => { setOpen(false); setPanel("mesure"); }}>
              📏 Enregistrer une nouvelle mesure
            </button>
          )}
          {staff && (
            <button type="button" role="menuitem" className={item} onClick={() => { setOpen(false); setPanel("parents"); }}>
              👪 Contacts parents{guardians.length ? ` (${guardians.length})` : ""}
            </button>
          )}
          <Link role="menuitem" href={`/joueurs/${playerId}/rapport`} className={item} onClick={() => setOpen(false)}>
            📄 Bilan PDF
          </Link>
        </div>
      )}

      {panel && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6"
          style={{ background: "rgba(0,0,0,.7)" }}
          onClick={() => setPanel(null)}
          role="dialog"
          aria-modal="true"
          aria-label={panel === "mesure" ? "Nouvelle mesure" : "Contacts parents"}
        >
          <div className="card w-full max-w-3xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold">{panel === "mesure" ? "Enregistrer une nouvelle mesure" : "Parents / responsables"}</h2>
              <button type="button" className="text-xs" onClick={() => setPanel(null)}>Fermer ✕</button>
            </div>
            {panel === "mesure" ? (
              <MeasureForm playerId={playerId} height={height} weight={weight} wingspan={wingspan} hand={hand} previousClub={previousClub} onDone={() => setPanel(null)} />
            ) : (
              <GuardiansList guardians={guardians} canAdd={canAddGuardians} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MeasureForm({ playerId, height, weight, wingspan, hand, previousClub, onDone }: {
  playerId: string; height: number | null; weight: number | null; wingspan: number | null; hand: string | null; previousClub: string | null; onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      action={(fd) =>
        start(async () => {
          const r = await updatePlayerMeasures(playerId, fd);
          if (r.error) setError(r.error);
          else { setError(null); onDone(); router.refresh(); }
        })
      }
    >
      <div><label className="label">Date de la mesure</label><input className="input" type="date" name="measured_at" defaultValue={today} required /></div>
      <div><label className="label">Taille (cm)</label><input className="input" name="height_cm" inputMode="decimal" defaultValue={height ?? ""} /></div>
      <div><label className="label">Poids (kg)</label><input className="input" name="weight_kg" inputMode="decimal" defaultValue={weight ?? ""} /></div>
      <div><label className="label">Envergure (cm)</label><input className="input" name="wingspan_cm" inputMode="decimal" defaultValue={wingspan ?? ""} /></div>
      <div>
        <label className="label">Main</label>
        <select className="input" name="dominant_hand" defaultValue={hand ?? ""}>
          <option value="">—</option>
          <option value="droite">Droite</option>
          <option value="gauche">Gauche</option>
          <option value="ambidextre">Ambidextre</option>
        </select>
      </div>
      <div><label className="label">Ancien club</label><input className="input" name="previous_club" defaultValue={previousClub ?? ""} /></div>
      <div className="col-span-full flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
        <button type="button" className="btn-secondary" onClick={onDone}>Annuler</button>
        {error && <span className="text-xs" style={{ color: "#f87171" }}>{error}</span>}
      </div>
    </form>
  );
}

function GuardiansList({ guardians, canAdd }: { guardians: GuardianContact[]; canAdd: boolean }) {
  if (guardians.length === 0) {
    return (
      <p className="text-sm text-faint">
        Aucun parent renseigné. {canAdd ? <Link href="/administration" className="underline">Les ajouter dans l&apos;administration</Link> : "Demande à la direction de les ajouter."}
      </p>
    );
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {guardians.map((g) => (
        <li key={g.id} className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surf-2)" }}>
          <p className="font-medium">
            {g.full_name} <span className="text-xs text-faint">· {REL[g.relationship] ?? "Responsable"}{g.is_primary ? " · contact principal" : ""}</span>
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-4 text-xs">
            {g.phone && <a href={`tel:${g.phone.replace(/\s/g, "")}`} className="underline">📞 {g.phone}</a>}
            {g.email && <a href={`mailto:${g.email}`} className="underline">✉ {g.email}</a>}
            {!g.phone && !g.email && <span className="text-faint">Aucun contact</span>}
          </p>
        </li>
      ))}
    </ul>
  );
}
