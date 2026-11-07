import Link from "next/link";
import type { ReactNode } from "react";
import {
  MONTH_SHORT,
  SEASON_MONTHS,
  rowMatchesCategory,
  type GuideCategory,
  type GuideItem,
  type GuidePeriod,
  type TechnicalGuide,
} from "@/lib/technical-guide";

const tint = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

type IconName = "target" | "bolt" | "idea" | "attack" | "defense";

function Ico({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...common}>
          <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
        </svg>
      );
    case "idea":
      return (
        <svg {...common}>
          <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" />
        </svg>
      );
    case "attack":
      return (
        <svg {...common}>
          <path d="M5 19 19 5M9 5h10v10" />
        </svg>
      );
    case "defense":
      return (
        <svg {...common}>
          <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
        </svg>
      );
  }
}

function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <h2 className="display flex items-center gap-3 text-2xl font-bold uppercase">
        <span className="h-6 w-1.5 rounded" style={{ background: "var(--brand)" }} />
        {children}
      </h2>
      {hint && (
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function ItemList({ items, color }: { items: GuideItem[]; color: string }) {
  if (items.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-faint)" }}>
        Rien de renseigné pour l&apos;instant.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
          <span style={{ color: "var(--text-dim)" }}>
            {it.label && (
              <strong className="mr-1.5 font-semibold" style={{ color: "var(--text)" }}>
                {it.label} :
              </strong>
            )}
            {it.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CategoryOverview({ cat }: { cat: GuideCategory }) {
  const tiles: { icon: IconName; label: string; value: string }[] = [
    { icon: "target", label: "Priorité tactique", value: cat.tactical },
    { icon: "bolt", label: "Focus physique", value: cat.physical },
    { icon: "idea", label: "Philosophie d'apprentissage", value: cat.philosophy },
  ];
  return (
    <div
      className="card relative overflow-hidden"
      style={{ borderColor: tint(cat.color, 45), background: `linear-gradient(135deg, ${tint(cat.color, 12)}, var(--surf) 55%)` }}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,260px)_1fr] lg:items-center">
        <div>
          <p className="display text-7xl font-bold leading-none" style={{ color: cat.color }}>
            {cat.code}
          </p>
          <h2 className="display mt-2 text-2xl font-bold uppercase">{cat.title}</h2>
          {cat.subtitle && (
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>
              {cat.subtitle}
            </p>
          )}
          {cat.badge && (
            <span
              className="mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: tint(cat.color, 18), color: cat.color, border: `1px solid ${tint(cat.color, 50)}` }}
            >
              {cat.badge}
            </span>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-xl p-4" style={{ background: "var(--surf)", border: "1px solid var(--border)" }}>
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: cat.color }}>
                <Ico name={t.icon} size={16} />
                {t.label}
              </p>
              <p className="mt-2 text-sm font-medium">{t.value || "—"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContentCards({ cat }: { cat: GuideCategory }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card" style={{ borderTop: `3px solid ${cat.color}` }}>
        <h3 className="display mb-4 flex items-center gap-2 text-xl font-bold uppercase" style={{ color: cat.color }}>
          <Ico name="attack" /> Attaque
        </h3>
        <ItemList items={cat.attack} color={cat.color} />
      </div>
      <div className="card" style={{ borderTop: `3px solid ${cat.color}` }}>
        <h3 className="display mb-4 flex items-center gap-2 text-xl font-bold uppercase" style={{ color: cat.color }}>
          <Ico name="defense" /> Défense
        </h3>
        <ItemList items={cat.defense} color={cat.color} />
      </div>
    </div>
  );
}

function YearBar({ periods }: { periods: GuidePeriod[] }) {
  const currentMonth = new Date().getMonth() + 1;
  const idx = (m: number) => SEASON_MONTHS.indexOf(m as (typeof SEASON_MONTHS)[number]);
  return (
    <div className="card overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${SEASON_MONTHS.length}, minmax(0, 1fr))` }}>
          {SEASON_MONTHS.map((m) => (
            <div
              key={m}
              className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: m === currentMonth ? "var(--brand)" : "var(--text-faint)" }}
            >
              {MONTH_SHORT[m]}
              {m === currentMonth && <span className="block text-[9px] leading-none">▼ ici</span>}
            </div>
          ))}
          {periods.map((p, i) => {
            const s = idx(p.start_month);
            const e = idx(p.end_month);
            if (s < 0 || e < s) return null;
            return (
              <div
                key={i}
                className="min-w-0 rounded-lg px-3 py-2"
                style={{
                  gridColumn: `${s + 1} / ${e + 2}`,
                  gridRow: 2,
                  background: tint(p.color, 22),
                  border: `1px solid ${tint(p.color, 60)}`,
                }}
              >
                <p className="display truncate text-sm font-bold uppercase" style={{ color: p.color }}>
                  {p.name.split(":")[0]}
                </p>
                <p className="truncate text-[11px]" style={{ color: "var(--text-dim)" }}>
                  {p.duration}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PeriodCards({ periods, cat }: { periods: GuidePeriod[]; cat: GuideCategory }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {periods.map((p, i) => {
        const rows = p.rows.filter((r) => rowMatchesCategory(r, cat.code));
        return (
          <div key={i} className="card" style={{ borderLeft: `4px solid ${p.color}` }}>
            <h3 className="display text-xl font-bold uppercase">{p.name}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {p.dates && (
                <span className="chip" style={{ background: tint(p.color, 16), color: p.color, borderColor: tint(p.color, 45) }}>
                  {p.dates}
                </span>
              )}
              {p.duration && <span className="chip">{p.duration}</span>}
            </div>
            {p.objective && (
              <p className="mt-3 text-sm" style={{ color: "var(--text-dim)" }}>
                <strong style={{ color: "var(--text)" }}>Objectif :</strong> {p.objective}
              </p>
            )}
            <div className="mt-4 space-y-3">
              {rows.map((r, j) => (
                <div key={j} className="rounded-xl p-3" style={{ background: "var(--surf-2)" }}>
                  {r.categories && (
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: cat.color }}>
                      {r.categories}
                    </p>
                  )}
                  <dl className="grid gap-3 sm:grid-cols-3">
                    {[
                      { k: "Volume hebdo", v: r.volume },
                      { k: "Focus physique", v: r.physical },
                      { k: "Focus tactique", v: r.tactical },
                    ].map((x) => (
                      <div key={x.k}>
                        <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
                          {x.k}
                        </dt>
                        <dd className="mt-0.5 text-sm font-medium">{x.v || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
              {rows.length === 0 && (
                <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                  Pas de volume défini pour {cat.code} sur cette période.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SessionsAndTruces({ guide }: { guide: TechnicalGuide }) {
  const { blocks } = guide.sessions;
  const total = Math.max(1, ...blocks.map((b) => b.end));
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="card lg:col-span-3">
        <h3 className="display mb-4 text-xl font-bold uppercase">{guide.sessions.title || "Structure d'une séance"}</h3>
        {blocks.length > 0 && (
          <div className="mb-5 flex h-9 w-full overflow-hidden rounded-lg">
            {blocks.map((b, i) => (
              <div
                key={i}
                className="flex min-w-0 items-center justify-center text-[11px] font-bold"
                style={{ flexGrow: Math.max(1, b.end - b.start), flexBasis: 0, background: b.color, color: "#0e0f12" }}
                title={`${b.title} — ${b.end - b.start} min`}
              >
                {b.end - b.start}&apos;
              </div>
            ))}
          </div>
        )}
        <ol className="space-y-3">
          {blocks.map((b, i) => (
            <li key={i} className="flex gap-3">
              <span
                className="h-fit w-24 shrink-0 rounded-md px-2 py-1 text-center text-xs font-bold"
                style={{ background: tint(b.color, 18), color: b.color }}
              >
                {b.start} – {b.end} min
              </span>
              <p className="text-sm" style={{ color: "var(--text-dim)" }}>
                <strong style={{ color: "var(--text)" }}>{b.title}</strong>
                {b.text ? ` — ${b.text}` : ""}
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[11px]" style={{ color: "var(--text-faint)" }}>
          Durée totale : {total} min
        </p>
      </div>

      <div className="card lg:col-span-2">
        <h3 className="display text-xl font-bold uppercase">{guide.truces.title || "Trêves scolaires"}</h3>
        {guide.truces.subtitle && (
          <p className="mt-1 text-sm font-semibold" style={{ color: "var(--brand)" }}>
            {guide.truces.subtitle}
          </p>
        )}
        <div className="mt-4 space-y-3">
          {guide.truces.items.map((it, i) => (
            <div key={i} className="rounded-xl p-3" style={{ background: "var(--surf-2)" }}>
              {it.label && (
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--brand)" }}>
                  {it.label}
                </p>
              )}
              <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
                {it.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GuideView({
  guide,
  activeCode,
  canEdit,
  updatedAt,
  updatedBy,
}: {
  guide: TechnicalGuide;
  activeCode?: string;
  canEdit: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}) {
  const active = guide.categories.find((c) => c.code === activeCode) ?? guide.categories[0];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="display text-4xl font-bold uppercase leading-none">{guide.header.title}</h1>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            {guide.header.subtitle}
          </p>
          {guide.header.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {guide.header.tags.map((t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/carnet-technique/joueurs" className="btn-secondary">
            Carnets des joueurs
          </Link>
          {canEdit && (
            <Link href="/carnet-technique/modifier" className="btn-primary">
              Modifier le cahier
            </Link>
          )}
        </div>
      </header>

      {!active ? (
        <div className="card text-sm" style={{ color: "var(--text-dim)" }}>
          Le cahier technique est vide pour l&apos;instant.
          {canEdit ? " Utilise « Modifier le cahier » pour ajouter une première catégorie." : ""}
        </div>
      ) : (
        <>
          <nav aria-label="Catégories" className="flex flex-wrap gap-3">
            {guide.categories.map((c) => {
              const isActive = c.code === active.code;
              return (
                <Link
                  key={c.code}
                  href={`/carnet-technique?cat=${encodeURIComponent(c.code)}`}
                  scroll={false}
                  aria-current={isActive ? "page" : undefined}
                  className="rounded-xl px-4 py-2.5 text-sm transition-colors"
                  style={{
                    border: `1px solid ${isActive ? c.color : tint(c.color, 40)}`,
                    background: isActive ? tint(c.color, 18) : "transparent",
                    color: isActive ? "var(--text)" : "var(--text-dim)",
                  }}
                >
                  <strong className="display text-base" style={{ color: c.color }}>
                    {c.code}
                  </strong>
                  {c.title ? ` — ${c.title}` : ""}
                </Link>
              );
            })}
          </nav>

          <CategoryOverview cat={active} />

          <section className="space-y-4">
            <SectionTitle hint={`Ce qui se travaille en ${active.code}, côté attaque et côté défense.`}>
              Contenus technico-tactiques
            </SectionTitle>
            <ContentCards cat={active} />
          </section>

          {guide.cycle.periods.length > 0 && (
            <section className="space-y-4">
              <SectionTitle hint={guide.cycle.intro}>{guide.cycle.title || "Planification du cycle annuel"}</SectionTitle>
              <YearBar periods={guide.cycle.periods} />
              <PeriodCards periods={guide.cycle.periods} cat={active} />
            </section>
          )}

          <section className="space-y-4">
            <SectionTitle hint="Commun à toutes les catégories.">Organisation des séances &amp; trêves scolaires</SectionTitle>
            <SessionsAndTruces guide={guide} />
          </section>
        </>
      )}

      {updatedAt && (
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          Dernière mise à jour le {new Date(updatedAt).toLocaleDateString("fr-FR")}
          {updatedBy ? ` par ${updatedBy}` : ""}.
        </p>
      )}
    </div>
  );
}
