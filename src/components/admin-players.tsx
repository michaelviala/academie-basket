"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { addGuardian, deleteGuardian, updateGuardian } from "@/app/(app)/administration/guardians";
import { RELATIONSHIPS, relationshipLabel, type Guardian, type GuardianInput, type Relationship } from "@/lib/guardians";

export type AdminPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  age: number;
  status: string;
  jersey: number | null;
  teamName: string | null;
  category: string | null;
};

const STATUS_LABELS: Record<string, string> = { actif: "Actif", inactif: "Inactif", blesse: "Blessé", parti: "Parti" };
const norm = (v: string) => v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[-'’]/g, " ");
const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR");

type SortKey = "nom" | "age" | "equipe" | "statut";

export function AdminPlayers({ players, guardians: initial }: { players: AdminPlayer[]; guardians: Guardian[] }) {
  const [guardians, setGuardians] = useState<Guardian[]>(initial);
  const [q, setQ] = useState("");
  const [team, setTeam] = useState("");
  const [status, setStatus] = useState("");
  const [parents, setParents] = useState<"" | "with" | "without" | "nocontact">("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "nom", dir: 1 });
  const [editing, setEditing] = useState<string | null>(null);

  const byPlayer = useMemo(() => {
    const m = new Map<string, Guardian[]>();
    for (const g of guardians) (m.get(g.playerId) ?? m.set(g.playerId, []).get(g.playerId)!).push(g);
    for (const l of m.values()) l.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.fullName.localeCompare(b.fullName, "fr"));
    return m;
  }, [guardians]);

  const teams = useMemo(() => [...new Set(players.flatMap((p) => (p.teamName ? [p.teamName] : [])))].sort((a, b) => a.localeCompare(b, "fr")), [players]);

  const rows = useMemo(() => {
    const nq = norm(q.trim());
    const list = players.filter((p) => {
      const gs = byPlayer.get(p.id) ?? [];
      if (team && p.teamName !== team) return false;
      if (status && p.status !== status) return false;
      if (parents === "with" && !gs.length) return false;
      if (parents === "without" && gs.length) return false;
      if (parents === "nocontact" && (!gs.length || gs.some((g) => g.email || g.phone))) return false;
      if (!nq) return true;
      const hay = norm([p.firstName, p.lastName, p.teamName ?? "", ...gs.flatMap((g) => [g.fullName, g.email, g.phone])].join(" "));
      return nq.split(/\s+/).every((t) => hay.includes(t));
    });
    const val = (p: AdminPlayer) =>
      sort.key === "age" ? p.age : sort.key === "equipe" ? `${p.category ?? "~"} ${p.teamName ?? ""}` : sort.key === "statut" ? p.status : `${p.lastName} ${p.firstName}`;
    list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "fr", { numeric: true });
      return (c || `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "fr")) * sort.dir;
    });
    return list;
  }, [players, byPlayer, q, team, status, parents, sort]);

  const without = players.filter((p) => !(byPlayer.get(p.id) ?? []).length).length;
  const active = !!(q || team || status || parents);
  const head = (key: SortKey, label: string) => (
    <th scope="col" className="px-3 py-2 text-left font-medium" aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {label} {sort.key === key ? (sort.dir === 1 ? "↑" : "↓") : ""}
      </button>
    </th>
  );

  const [copied, setCopied] = useState<string | null>(null);
  async function copyEmails() {
    const emails = [...new Set(rows.flatMap((p) => (byPlayer.get(p.id) ?? []).map((g) => g.email).filter(Boolean)))];
    if (!emails.length) { setCopied("Aucun e-mail de parent dans la sélection"); return; }
    try {
      await navigator.clipboard.writeText(emails.join("; "));
      setCopied(`${emails.length} adresse(s) copiée(s) — colle-les dans « Cci » de ton e-mail`);
    } catch {
      setCopied("Copie impossible sur cet appareil");
    }
    setTimeout(() => setCopied(null), 6000);
  }

  function exportCsv() {
    const esc = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Prénom", "Nom", "Date de naissance", "Catégorie", "Code catégorie", "Statut", "N°"];
    for (let i = 1; i <= 3; i++) header.push(`Parent ${i} - nom`, `Parent ${i} - lien`, `Parent ${i} - e-mail`, `Parent ${i} - téléphone`);
    const lines = [header.map(esc).join(";")];
    for (const p of rows) {
      const gs = byPlayer.get(p.id) ?? [];
      const cells: (string | number | null)[] = [p.firstName, p.lastName, fmtDate(p.birthDate), p.teamName, p.category, STATUS_LABELS[p.status] ?? p.status, p.jersey];
      for (let i = 0; i < 3; i++) cells.push(gs[i]?.fullName ?? "", gs[i] ? relationshipLabel(gs[i].relationship) : "", gs[i]?.email ?? "", gs[i]?.phone ?? "");
      lines.push(cells.map(esc).join(";"));
    }
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `joueurs-et-parents-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const sel = "input !py-1.5 text-sm";
  const editingPlayer = editing ? players.find((p) => p.id === editing) ?? null : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <input className={`${sel} col-span-2 sm:col-span-3 lg:col-span-2`} type="search" placeholder="Rechercher : joueur, parent, e-mail, téléphone…" aria-label="Rechercher" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={sel} aria-label="Catégorie" value={team} onChange={(e) => setTeam(e.target.value)}>
          <option value="">Toutes catégories</option>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className={sel} aria-label="Statut" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className={sel} aria-label="Parents" value={parents} onChange={(e) => setParents(e.target.value as typeof parents)}>
          <option value="">Parents : tous</option>
          <option value="with">Avec parent renseigné</option>
          <option value="without">Sans parent renseigné</option>
          <option value="nocontact">Parent sans e-mail ni téléphone</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--text-faint)" }}>
        <span>
          {rows.length} joueur{rows.length > 1 ? "s" : ""} sur {players.length} · <b style={{ color: without ? "#f59e0b" : undefined }}>{without} sans parent renseigné</b>
        </span>
        {active && (
          <button type="button" className="underline" onClick={() => { setQ(""); setTeam(""); setStatus(""); setParents(""); }}>
            Effacer les filtres
          </button>
        )}
        <div className="flex-1" />
        <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={exportCsv} disabled={!rows.length}>⤓ Exporter en CSV ({rows.length})</button>
        <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={copyEmails} disabled={!rows.length}>✉ Copier les e-mails des parents</button>
        {copied && <span className="text-xs text-faint" role="status">{copied}</span>}
      </div>

      {rows.length === 0 ? (
        <div className="empty">{players.length ? "Aucun joueur ne correspond à ces filtres." : "Aucun joueur pour l'instant."}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
          <table className="w-full min-w-[820px] text-sm">
            <thead style={{ background: "var(--surf-2)", color: "var(--text-faint)" }}>
              <tr>
                {head("nom", "Joueur")}
                {head("age", "Âge")}
                {head("equipe", "Catégorie")}
                {head("statut", "Statut")}
                <th scope="col" className="px-3 py-2 text-left font-medium">Parents / responsables</th>
                <th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const gs = byPlayer.get(p.id) ?? [];
                return (
                  <tr key={p.id} className="align-top" style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="px-3 py-2">
                      <Link href={`/joueurs/${p.id}`} className="font-semibold hover:underline">{p.firstName} {p.lastName}</Link>
                      {p.jersey !== null && <span className="ml-2 text-xs" style={{ color: "var(--text-faint)" }}>#{p.jersey}</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {p.age} ans
                      <div className="text-xs" style={{ color: "var(--text-faint)" }}>{fmtDate(p.birthDate)}</div>
                    </td>
                    <td className="px-3 py-2">
                      {p.teamName ?? <span style={{ color: "var(--text-faint)" }}>—</span>}
                      {p.category && <div className="text-xs" style={{ color: "var(--text-faint)" }}>{p.category}</div>}
                    </td>
                    <td className="px-3 py-2"><span className="chip">{STATUS_LABELS[p.status] ?? p.status}</span></td>
                    <td className="px-3 py-2">
                      {gs.length === 0 ? (
                        <span className="text-xs" style={{ color: "#f59e0b" }}>Aucun parent renseigné</span>
                      ) : (
                        <ul className="space-y-1">
                          {gs.map((g) => (
                            <li key={g.id} className="leading-tight">
                              <span className="font-medium">{g.fullName}</span>{" "}
                              <span className="text-xs" style={{ color: "var(--text-faint)" }}>({relationshipLabel(g.relationship)}{g.isPrimary ? " · contact principal" : ""})</span>
                              <div className="text-xs">
                                {g.phone && <a href={`tel:${g.phone.replace(/[^\d+]/g, "")}`} className="mr-3 hover:underline">{g.phone}</a>}
                                {g.email && <a href={`mailto:${g.email}`} className="hover:underline">{g.email}</a>}
                                {!g.phone && !g.email && <span style={{ color: "#f59e0b" }}>ni e-mail ni téléphone</span>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setEditing(p.id)}>
                        {gs.length ? "Modifier" : "+ Parent"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingPlayer && (
        <GuardiansDialog
          player={editingPlayer}
          list={byPlayer.get(editingPlayer.id) ?? []}
          onClose={() => setEditing(null)}
          onAdd={(g) => setGuardians((cur) => [...cur.map((x) => (g.isPrimary && x.playerId === g.playerId ? { ...x, isPrimary: false } : x)), g])}
          onUpdate={(g) => setGuardians((cur) => cur.map((x) => (x.id === g.id ? g : g.isPrimary && x.playerId === g.playerId ? { ...x, isPrimary: false } : x)))}
          onRemove={(id) => setGuardians((cur) => cur.filter((x) => x.id !== id))}
        />
      )}
    </div>
  );
}

function GuardiansDialog({
  player,
  list,
  onClose,
  onAdd,
  onUpdate,
  onRemove,
}: {
  player: AdminPlayer;
  list: Guardian[];
  onClose: () => void;
  onAdd: (g: Guardian) => void;
  onUpdate: (g: Guardian) => void;
  onRemove: (id: string) => void;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  function remove(g: Guardian) {
    if (!confirm(`Retirer ${g.fullName} de la fiche de ${player.firstName} ?`)) return;
    start(async () => {
      const r = await deleteGuardian(g.id);
      if (r.error) return setError(r.error);
      setError(null);
      onRemove(g.id);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto sm:items-center sm:p-4" style={{ background: "rgba(0,0,0,.7)" }} onClick={onClose} role="dialog" aria-modal="true" aria-label={`Parents de ${player.firstName} ${player.lastName}`}>
      <div className="card w-full max-w-xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Parents de {player.firstName} {player.lastName}</h3>
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>{player.teamName ?? "Sans catégorie"} · {player.age} ans</p>
          </div>
          <button type="button" className="text-2xl leading-none" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}

        {list.length === 0 && <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucun parent renseigné pour ce joueur.</p>}
        <ul className="space-y-3">
          {list.map((g) =>
            editId === g.id ? (
              <li key={g.id} className="rounded-xl border p-3" style={{ borderColor: "var(--brand)" }}>
                <GuardianForm
                  initial={g}
                  playerId={player.id}
                  submitLabel="Enregistrer"
                  onCancel={() => setEditId(null)}
                  onSubmit={async (input) => {
                    const r = await updateGuardian(g.id, input);
                    if (r.error || !r.guardian) return r.error ?? "Enregistrement impossible.";
                    onUpdate(r.guardian);
                    setEditId(null);
                    return null;
                  }}
                />
              </li>
            ) : (
              <li key={g.id} className="flex items-start justify-between gap-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                <div className="min-w-0 text-sm">
                  <p className="font-medium">
                    {g.fullName} <span className="text-xs font-normal" style={{ color: "var(--text-faint)" }}>({relationshipLabel(g.relationship)})</span>
                    {g.isPrimary && <span className="chip ml-2">Contact principal</span>}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                    {[g.phone, g.email].filter(Boolean).join(" · ") || "ni e-mail ni téléphone"}
                  </p>
                  {g.notes && <p className="mt-1 text-xs">{g.notes}</p>}
                </div>
                <div className="flex flex-none gap-2">
                  <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setEditId(g.id)}>Modifier</button>
                  <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" style={{ color: "#f87171" }} onClick={() => remove(g)} disabled={pending}>Retirer</button>
                </div>
              </li>
            ),
          )}
        </ul>

        <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <p className="mb-2 text-sm font-semibold">Ajouter un parent</p>
          <GuardianForm
            key={list.length}
            playerId={player.id}
            initial={null}
            submitLabel="+ Ajouter"
            onSubmit={async (input) => {
              const r = await addGuardian(input);
              if (r.error || !r.guardian) return r.error ?? "Ajout impossible.";
              onAdd(r.guardian);
              return null;
            }}
          />
        </div>
      </div>
    </div>
  );
}

function GuardianForm({
  initial,
  playerId,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Guardian | null;
  playerId: string;
  submitLabel: string;
  onSubmit: (i: GuardianInput) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [relationship, setRelationship] = useState<Relationship>(initial?.relationship ?? "mere");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [isPrimary, setIsPrimary] = useState(initial?.isPrimary ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const err = await onSubmit({ playerId, fullName, relationship, email, phone, isPrimary, notes });
      if (err) setError(err);
    });
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <label className="text-xs sm:col-span-1" style={{ color: "var(--text-faint)" }}>
        Nom et prénom *
        <input className="input mt-1 w-full" required maxLength={120} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="off" />
      </label>
      <label className="text-xs" style={{ color: "var(--text-faint)" }}>
        Lien avec le joueur
        <select className="input mt-1 w-full" value={relationship} onChange={(e) => setRelationship(e.target.value as Relationship)}>
          {RELATIONSHIPS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </label>
      <label className="text-xs" style={{ color: "var(--text-faint)" }}>
        Téléphone
        <input className="input mt-1 w-full" type="tel" inputMode="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" />
      </label>
      <label className="text-xs" style={{ color: "var(--text-faint)" }}>
        E-mail
        <input className="input mt-1 w-full" type="email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="text-xs sm:col-span-2" style={{ color: "var(--text-faint)" }}>
        Remarque (facultatif)
        <input className="input mt-1 w-full" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex. joignable après 18 h" />
      </label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
        Contact principal (prévenu en premier)
      </label>
      {error && <p className="text-xs sm:col-span-2" style={{ color: "#f87171" }}>{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn-primary !py-1.5" disabled={pending}>{submitLabel}</button>
        {onCancel && <button type="button" className="btn-secondary !py-1.5" onClick={onCancel}>Annuler</button>}
      </div>
    </form>
  );
}
