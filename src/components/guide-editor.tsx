"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { saveTechnicalGuide } from "@/app/(app)/carnet-technique/actions";
import {
  MONTH_LONG,
  type GuideCategory,
  type GuideItem,
  type GuidePeriod,
  type PeriodRow,
  type SessionBlock,
  type TechnicalGuide,
} from "@/lib/technical-guide";

type Path = (string | number)[];
type Node = Record<string | number, unknown>;

function getIn(root: unknown, path: Path): unknown {
  return path.reduce<unknown>((cur, k) => (cur as Node)[k], root);
}

function setIn<T>(root: T, path: Path, value: unknown): T {
  const clone = structuredClone(root) as unknown as Node;
  let cur = clone;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]] as Node;
  cur[path[path.length - 1]] = value;
  return clone as unknown as T;
}

type Api = {
  set: (path: Path, value: unknown) => void;
  add: (path: Path, item: unknown) => void;
  remove: (path: Path, index: number) => void;
  move: (path: Path, index: number, dir: -1 | 1) => void;
};

// --- Petits composants de formulaire -------------------------------------------------

function Field({
  label,
  value,
  onChange,
  area,
  type = "text",
  min,
  max,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  area?: boolean;
  type?: "text" | "number";
  min?: number;
  max?: number;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {area ? (
        <textarea className="input min-h-20" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="input" type={type} min={min} max={max} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function ColorField({ label = "Couleur", value, onChange }: { label?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full cursor-pointer rounded-lg"
        style={{ background: "var(--surf-2)", border: "1px solid var(--border)", padding: 2 }}
      />
    </label>
  );
}

function MonthSelect({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <option key={m} value={m}>
            {MONTH_LONG[m]}
          </option>
        ))}
      </select>
    </label>
  );
}

function RowTools({ index, count, onMove, onRemove }: { index: number; count: number; onMove: (d: -1 | 1) => void; onRemove: () => void }) {
  const btn = "btn-secondary !px-2.5 !py-1 text-xs disabled:opacity-40";
  return (
    <div className="flex gap-1">
      <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(-1)} aria-label="Monter">
        ↑
      </button>
      <button type="button" className={btn} disabled={index === count - 1} onClick={() => onMove(1)} aria-label="Descendre">
        ↓
      </button>
      <button type="button" className={btn} style={{ color: "var(--red)" }} onClick={onRemove} aria-label="Supprimer">
        Supprimer
      </button>
    </div>
  );
}

function Section({ title, hint, children, open = false }: { title: string; hint?: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="card group" open={open}>
      <summary className="display cursor-pointer select-none text-xl font-bold uppercase">
        {title}
        {hint && (
          <span className="ml-3 font-sans text-xs font-normal normal-case" style={{ color: "var(--text-faint)" }}>
            {hint}
          </span>
        )}
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}

function SubCard({ title, tools, children }: { title: string; tools?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl p-4" style={{ background: "var(--surf-2)", border: "1px solid var(--border)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        {tools}
      </div>
      {children}
    </div>
  );
}

function AddButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="btn-secondary" onClick={onClick}>
      + {children}
    </button>
  );
}

// --- Listes réutilisables --------------------------------------------------------------

function ItemsEditor({ path, items, api, addLabel }: { path: Path; items: GuideItem[]; api: Api; addLabel: string }) {
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="grid gap-2 rounded-lg p-3 md:grid-cols-[180px_1fr_auto] md:items-end" style={{ background: "var(--surf)", border: "1px solid var(--border)" }}>
          <Field label="Titre (facultatif)" value={it.label} onChange={(v) => api.set([...path, i, "label"], v)} />
          <Field label="Contenu" value={it.text} onChange={(v) => api.set([...path, i, "text"], v)} area />
          <RowTools index={i} count={items.length} onMove={(d) => api.move(path, i, d)} onRemove={() => api.remove(path, i)} />
        </div>
      ))}
      <AddButton onClick={() => api.add(path, { label: "", text: "" } satisfies GuideItem)}>{addLabel}</AddButton>
    </div>
  );
}

// --- Éditeur principal --------------------------------------------------------------------

export function GuideEditor({ initial }: { initial: TechnicalGuide }) {
  const [g, setG] = useState<TechnicalGuide>(initial);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const api: Api = {
    set: (path, value) => setG((p) => setIn(p, path, value)),
    add: (path, item) => setG((p) => setIn(p, path, [...(getIn(p, path) as unknown[]), item])),
    remove: (path, index) =>
      setG((p) =>
        setIn(
          p,
          path,
          (getIn(p, path) as unknown[]).filter((_, i) => i !== index)
        )
      ),
    move: (path, index, dir) =>
      setG((p) => {
        const arr = [...(getIn(p, path) as unknown[])];
        const j = index + dir;
        if (j < 0 || j >= arr.length) return p;
        [arr[index], arr[j]] = [arr[j], arr[index]];
        return setIn(p, path, arr);
      }),
  };

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await saveTechnicalGuide(g);
      setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: "Carnets techniques enregistrés." });
    });
  }

  const newCategory: GuideCategory = {
    code: "U",
    color: "#3b82f6",
    title: "",
    subtitle: "",
    badge: "",
    tactical: "",
    physical: "",
    philosophy: "",
    attack: [],
    defense: [],
  };
  const newPeriod: GuidePeriod = {
    name: "",
    dates: "",
    duration: "",
    start_month: 9,
    end_month: 10,
    color: "#3b82f6",
    objective: "",
    rows: [],
  };
  const newRow: PeriodRow = { categories: "", volume: "", physical: "", tactical: "" };
  const newBlock: SessionBlock = { start: 0, end: 15, title: "", text: "", color: "#3b82f6" };

  return (
    <div className="space-y-6">
      <div
        className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
        style={{ background: "var(--surf)", border: "1px solid var(--border)" }}
      >
        <div>
          <h1 className="display text-2xl font-bold uppercase">Modifier les carnets techniques</h1>
          <p className="text-xs" style={{ color: "var(--text-faint)" }}>
            Les changements ne sont visibles par les autres qu&apos;après enregistrement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {msg && (
            <span className="text-sm font-medium" style={{ color: msg.ok ? "var(--green)" : "var(--red)" }}>
              {msg.text}
            </span>
          )}
          <Link href="/carnet-technique" className="btn-secondary">
            Retour aux carnets
          </Link>
          <button type="button" className="btn-primary disabled:opacity-60" onClick={save} disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      {/* En-tête */}
      <Section title="En-tête" open>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Titre" value={g.header.title} onChange={(v) => api.set(["header", "title"], v)} />
          <Field label="Sous-titre" value={g.header.subtitle} onChange={(v) => api.set(["header", "subtitle"], v)} />
        </div>
        <div className="space-y-2">
          <span className="label">Étiquettes</span>
          {g.header.tags.map((t, i) => (
            <div key={i} className="flex gap-2">
              <input className="input" value={t} onChange={(e) => api.set(["header", "tags", i], e.target.value)} />
              <button type="button" className="btn-secondary" style={{ color: "var(--red)" }} onClick={() => api.remove(["header", "tags"], i)}>
                Supprimer
              </button>
            </div>
          ))}
          <AddButton onClick={() => api.add(["header", "tags"], "")}>Ajouter une étiquette</AddButton>
        </div>
      </Section>

      {/* Catégories */}
      <Section title="Catégories" hint="Chaque catégorie devient un onglet : orientation, contenus attaque / défense." open>
        {g.categories.map((c, ci) => (
          <SubCard
            key={ci}
            title={`${c.code}${c.title ? " — " + c.title : ""}`}
            tools={<RowTools index={ci} count={g.categories.length} onMove={(d) => api.move(["categories"], ci, d)} onRemove={() => api.remove(["categories"], ci)} />}
          >
            <div className="grid gap-3 md:grid-cols-[100px_1fr_1fr_1fr_90px]">
              <Field label="Code" value={c.code} onChange={(v) => api.set(["categories", ci, "code"], v)} />
              <Field label="Titre" value={c.title} onChange={(v) => api.set(["categories", ci, "title"], v)} />
              <Field label="Sous-titre (niveaux)" value={c.subtitle} onChange={(v) => api.set(["categories", ci, "subtitle"], v)} />
              <Field label="Étiquette" value={c.badge} onChange={(v) => api.set(["categories", ci, "badge"], v)} />
              <p className="self-end pb-2 text-[11px]" style={{ color: "var(--text-faint)" }}>Couleur : Administration › Catégories</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Priorité tactique" value={c.tactical} onChange={(v) => api.set(["categories", ci, "tactical"], v)} area />
              <Field label="Focus physique" value={c.physical} onChange={(v) => api.set(["categories", ci, "physical"], v)} area />
              <Field label="Philosophie d'apprentissage" value={c.philosophy} onChange={(v) => api.set(["categories", ci, "philosophy"], v)} area />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: c.color }}>
              Attaque
            </p>
            <ItemsEditor path={["categories", ci, "attack"]} items={c.attack} api={api} addLabel="Ajouter un point d'attaque" />
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: c.color }}>
              Défense
            </p>
            <ItemsEditor path={["categories", ci, "defense"]} items={c.defense} api={api} addLabel="Ajouter un point de défense" />
          </SubCard>
        ))}
        <AddButton onClick={() => api.add(["categories"], newCategory)}>Ajouter une catégorie</AddButton>
      </Section>

      {/* Cycle annuel */}
      <Section title="Cycle annuel" hint="Périodes de la saison et volume par catégorie.">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Titre de la section" value={g.cycle.title} onChange={(v) => api.set(["cycle", "title"], v)} />
          <Field label="Introduction" value={g.cycle.intro} onChange={(v) => api.set(["cycle", "intro"], v)} />
        </div>
        {g.cycle.periods.map((p, pi) => (
          <SubCard
            key={pi}
            title={p.name || `Période ${pi + 1}`}
            tools={<RowTools index={pi} count={g.cycle.periods.length} onMove={(d) => api.move(["cycle", "periods"], pi, d)} onRemove={() => api.remove(["cycle", "periods"], pi)} />}
          >
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_90px]">
              <Field label="Nom" value={p.name} onChange={(v) => api.set(["cycle", "periods", pi, "name"], v)} />
              <Field label="Dates (texte)" value={p.dates} onChange={(v) => api.set(["cycle", "periods", pi, "dates"], v)} />
              <Field label="Durée (texte)" value={p.duration} onChange={(v) => api.set(["cycle", "periods", pi, "duration"], v)} />
              <ColorField value={p.color} onChange={(v) => api.set(["cycle", "periods", pi, "color"], v)} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <MonthSelect label="Premier mois (frise)" value={p.start_month} onChange={(v) => api.set(["cycle", "periods", pi, "start_month"], v)} />
              <MonthSelect label="Dernier mois (frise)" value={p.end_month} onChange={(v) => api.set(["cycle", "periods", pi, "end_month"], v)} />
            </div>
            <Field label="Objectif" value={p.objective} onChange={(v) => api.set(["cycle", "periods", pi, "objective"], v)} area />
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
              Volume et focus par catégories (ex. « U11 / U13 »)
            </p>
            {p.rows.map((r, ri) => (
              <div key={ri} className="space-y-2 rounded-lg p-3" style={{ background: "var(--surf)", border: "1px solid var(--border)" }}>
                <div className="grid gap-2 md:grid-cols-4">
                  <Field label="Catégories" value={r.categories} onChange={(v) => api.set(["cycle", "periods", pi, "rows", ri, "categories"], v)} />
                  <Field label="Volume hebdo" value={r.volume} onChange={(v) => api.set(["cycle", "periods", pi, "rows", ri, "volume"], v)} />
                  <Field label="Focus physique" value={r.physical} onChange={(v) => api.set(["cycle", "periods", pi, "rows", ri, "physical"], v)} />
                  <Field label="Focus tactique" value={r.tactical} onChange={(v) => api.set(["cycle", "periods", pi, "rows", ri, "tactical"], v)} />
                </div>
                <RowTools index={ri} count={p.rows.length} onMove={(d) => api.move(["cycle", "periods", pi, "rows"], ri, d)} onRemove={() => api.remove(["cycle", "periods", pi, "rows"], ri)} />
              </div>
            ))}
            <AddButton onClick={() => api.add(["cycle", "periods", pi, "rows"], newRow)}>Ajouter une ligne</AddButton>
          </SubCard>
        ))}
        <AddButton onClick={() => api.add(["cycle", "periods"], newPeriod)}>Ajouter une période</AddButton>
      </Section>

      {/* Séance type */}
      <Section title="Structure d'une séance" hint="Blocs de la séance type, en minutes.">
        <Field label="Titre" value={g.sessions.title} onChange={(v) => api.set(["sessions", "title"], v)} />
        {g.sessions.blocks.map((b, bi) => (
          <SubCard
            key={bi}
            title={b.title || `Bloc ${bi + 1}`}
            tools={<RowTools index={bi} count={g.sessions.blocks.length} onMove={(d) => api.move(["sessions", "blocks"], bi, d)} onRemove={() => api.remove(["sessions", "blocks"], bi)} />}
          >
            <div className="grid gap-3 md:grid-cols-[90px_90px_1fr_90px]">
              <Field label="Début (min)" type="number" min={0} max={600} value={b.start} onChange={(v) => api.set(["sessions", "blocks", bi, "start"], Number(v))} />
              <Field label="Fin (min)" type="number" min={0} max={600} value={b.end} onChange={(v) => api.set(["sessions", "blocks", bi, "end"], Number(v))} />
              <Field label="Titre" value={b.title} onChange={(v) => api.set(["sessions", "blocks", bi, "title"], v)} />
              <ColorField value={b.color} onChange={(v) => api.set(["sessions", "blocks", bi, "color"], v)} />
            </div>
            <Field label="Contenu" value={b.text} onChange={(v) => api.set(["sessions", "blocks", bi, "text"], v)} area />
          </SubCard>
        ))}
        <AddButton onClick={() => api.add(["sessions", "blocks"], newBlock)}>Ajouter un bloc</AddButton>
      </Section>

      {/* Trêves */}
      <Section title="Trêves scolaires">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Titre" value={g.truces.title} onChange={(v) => api.set(["truces", "title"], v)} />
          <Field label="Sous-titre" value={g.truces.subtitle} onChange={(v) => api.set(["truces", "subtitle"], v)} />
        </div>
        <ItemsEditor path={["truces", "items"]} items={g.truces.items} api={api} addLabel="Ajouter une semaine" />
      </Section>

      <div className="flex justify-end gap-2 pb-6">
        {msg && (
          <span className="self-center text-sm font-medium" style={{ color: msg.ok ? "var(--green)" : "var(--red)" }}>
            {msg.text}
          </span>
        )}
        <button type="button" className="btn-primary disabled:opacity-60" onClick={save} disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
