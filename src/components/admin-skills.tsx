"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSkill, saveSkill } from "@/app/(app)/administration/skills";
import { SKILL_CATEGORIES, SKILL_CATEGORY_LABELS, SKILL_CATEGORY_RUBRIC, type SkillCategory } from "@/lib/skills";

export type AdminSkill = { id: string; name: string; category: SkillCategory; evaluations: number };

const RUBRIC_LABEL: Record<string, string> = { technique: "Technique", tactique: "Tactique", physique: "Physique", mental: "Mental" };

/** Administration › Référentiel de compétences : ajout, renommage, reclassement, suppression, par type. */
export function AdminSkills({ skills }: { skills: AdminSkill[] }) {
  const [open, setOpen] = useState<SkillCategory | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; category: SkillCategory }>({ name: "", category: "tir" });
  const [adding, setAdding] = useState<SkillCategory | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const byCat = useMemo(() => {
    const m = new Map<SkillCategory, AdminSkill[]>();
    for (const c of SKILL_CATEGORIES) m.set(c, []);
    for (const s of skills) m.get(s.category)?.push(s);
    for (const list of m.values()) list.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return m;
  }, [skills]);

  const run = (fn: () => Promise<{ error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r.error) setError(r.error);
      else { after?.(); router.refresh(); }
    });

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Référentiel de compétences</h2>
        <span className="text-xs" style={{ color: "var(--text-faint)" }}>{skills.length} compétences · 9 types</span>
      </div>
      <p className="text-xs" style={{ color: "var(--text-faint)" }}>
        Les compétences sont proposées dans les évaluations et les blocs de séance. Clique sur un type pour voir, ajouter, renommer ou reclasser ses compétences. Une compétence déjà utilisée ne peut pas être supprimée (renomme-la).
      </p>
      {error && <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>{error}</p>}
      <ul className="space-y-1">
        {SKILL_CATEGORIES.map((c) => {
          const list = byCat.get(c) ?? [];
          const isOpen = open === c;
          return (
            <li key={c} className="rounded-lg" style={{ background: "var(--surf-2)" }}>
              <button type="button" className="flex w-full items-center justify-between px-3 py-2 text-left text-sm" onClick={() => setOpen(isOpen ? null : c)} aria-expanded={isOpen}>
                <span>
                  <span className="mr-1" style={{ color: "var(--text-faint)" }}>{isOpen ? "▾" : "▸"}</span>
                  <span className="font-semibold">{SKILL_CATEGORY_LABELS[c]}</span>
                  <span className="ml-2 text-xs" style={{ color: "var(--text-faint)" }}>rubrique {RUBRIC_LABEL[SKILL_CATEGORY_RUBRIC[c]]}</span>
                </span>
                <span style={{ color: "var(--text-faint)" }}>{list.length} compétence{list.length > 1 ? "s" : ""}</span>
              </button>
              {isOpen && (
                <div className="space-y-1 px-3 pb-3">
                  {list.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center gap-2 rounded px-2 py-1 text-sm" style={{ background: "var(--surf)" }}>
                      {editing === s.id ? (
                        <>
                          <input className="input" style={{ flex: 1, minWidth: 160 }} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} autoFocus />
                          <select className="input" style={{ width: "auto" }} value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as SkillCategory }))}>
                            {SKILL_CATEGORIES.map((k) => <option key={k} value={k}>{SKILL_CATEGORY_LABELS[k]}</option>)}
                          </select>
                          <button type="button" className="btn-primary" style={{ padding: "4px 10px", fontSize: 12 }} disabled={pending} onClick={() => run(() => saveSkill(s.id, draft), () => setEditing(null))}>OK</button>
                          <button type="button" className="btn-secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setEditing(null)}>Annuler</button>
                        </>
                      ) : (
                        <>
                          <span style={{ flex: 1 }}>{s.name}</span>
                          <span className="text-xs" style={{ color: "var(--text-faint)" }}>{s.evaluations} éval.</span>
                          <button type="button" className="text-xs underline" onClick={() => { setEditing(s.id); setDraft({ name: s.name, category: s.category }); }}>Modifier</button>
                          {s.evaluations === 0 && (
                            <button type="button" className="text-xs underline" style={{ color: "#f87171" }} disabled={pending}
                              onClick={() => { if (window.confirm(`Supprimer la compétence « ${s.name} » ?`)) run(() => deleteSkill(s.id)); }}>
                              Supprimer
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                  {adding === c ? (
                    <form
                      className="flex flex-wrap items-center gap-2 pt-1"
                      onSubmit={(e) => { e.preventDefault(); run(() => saveSkill(null, { name: newName, category: c }), () => { setNewName(""); setAdding(null); }); }}
                    >
                      <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder={`Nouvelle compétence — ${SKILL_CATEGORY_LABELS[c]}`} value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus required />
                      <button className="btn-primary" style={{ padding: "4px 10px", fontSize: 12 }} disabled={pending}>Ajouter</button>
                      <button type="button" className="btn-secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setAdding(null)}>Annuler</button>
                    </form>
                  ) : (
                    <button type="button" className="text-xs font-semibold" style={{ color: "var(--brand)" }} onClick={() => { setAdding(c); setNewName(""); }}>+ Ajouter une compétence</button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
