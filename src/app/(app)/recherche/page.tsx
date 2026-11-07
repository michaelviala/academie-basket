import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { formatDateLong } from "@/lib/sessions";

const clean = (q: string) => q.replace(/[%,()\\]/g, " ").trim().slice(0, 60);

export default async function RecherchePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const term = clean(q);
  const profile = await requireProfile();
  const staff = ["admin", "directeur_sportif", "coach", "preparateur_physique"].includes(profile.role);
  const supabase = await createClient();
  const like = `%${term}%`;

  const [players, sessions, videos, systems, library] = term.length >= 2
    ? await Promise.all([
        supabase.from("players").select("id, first_name, last_name, teams(name)").or(`first_name.ilike.${like},last_name.ilike.${like}`).limit(8),
        staff ? supabase.from("trainings").select("id, date, objective, teams(name)").ilike("objective", like).order("date", { ascending: false }).limit(8) : Promise.resolve({ data: [] }),
        staff ? supabase.from("videos").select("id, title").ilike("title", like).limit(8) : Promise.resolve({ data: [] }),
        staff ? supabase.from("systems").select("id, name").ilike("name", like).limit(8) : Promise.resolve({ data: [] }),
        staff ? supabase.from("library_items").select("id, title").ilike("title", like).limit(8) : Promise.resolve({ data: [] }),
      ])
    : [null, null, null, null, null];

  const total = [players, sessions, videos, systems, library].reduce((n, r) => n + (r?.data?.length ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-2xl font-bold">Recherche</h1>
        <form action="/recherche" className="mt-3 flex max-w-xl gap-2">
          <input className="input" name="q" defaultValue={q} placeholder="Joueur, séance, vidéo, système, document…" autoFocus />
          <button className="btn-primary">Chercher</button>
        </form>
      </div>

      {term.length < 2 && <p className="text-sm text-faint">Tape au moins 2 lettres.</p>}
      {term.length >= 2 && total === 0 && <div className="empty">Aucun résultat pour « {term} ».</div>}

      <Section title="Joueurs" items={(players?.data ?? []).map((p) => ({ id: p.id, href: `/joueurs/${p.id}`, label: `${p.first_name} ${p.last_name}`, hint: (p.teams as { name: string } | null)?.name }))} />
      <Section title="Séances" items={(sessions?.data ?? []).map((t) => ({ id: t.id, href: `/seances/${t.id}`, label: t.objective ?? "Séance", hint: `${formatDateLong(t.date)} · ${(t.teams as { name: string } | null)?.name ?? ""}` }))} />
      <Section title="Vidéos" items={(videos?.data ?? []).map((v) => ({ id: v.id, href: `/videos`, label: v.title }))} />
      <Section title="Systèmes" items={(systems?.data ?? []).map((s) => ({ id: s.id, href: `/systemes`, label: s.name }))} />
      <Section title="Bibliothèque" items={(library?.data ?? []).map((l) => ({ id: l.id, href: `/bibliotheque`, label: l.title }))} />
    </div>
  );
}

function Section({ title, items }: { title: string; items: { id: string; href: string; label: string; hint?: string | null }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="card">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.id}>
            <Link href={i.href} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surf-2)" }}>
              <span className="truncate">{i.label}</span>
              {i.hint && <span className="shrink-0 text-xs text-faint">{i.hint}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
