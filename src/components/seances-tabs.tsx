import Link from "next/link";

const TABS = [
  { key: "contenu", href: "/seances", label: "Contenu des séances" },
  { key: "calendrier", href: "/seances/calendrier", label: "Calendrier" },
] as const;

export function SeancesHeader({
  active,
  canCreate,
}: {
  active: "contenu" | "calendrier";
  canCreate: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-3xl font-bold uppercase">Séances</h1>
          <p className="text-sm" style={{ color: "var(--text-faint)" }}>
            Prépare le déroulé de chaque séance et retrouve le planning.
          </p>
        </div>
        {canCreate && (
          <Link href="/seances/nouvelle" className="btn-primary">
            + Nouvelle séance
          </Link>
        )}
      </div>
      <nav className="flex gap-2" aria-label="Sections des séances">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={t.key === active ? "page" : undefined}
            className="rounded-xl px-4 py-2 text-sm font-semibold"
            style={{
              background: t.key === active ? "var(--brand)" : "var(--surf-2)",
              color: t.key === active ? "#fff" : "var(--text-dim)",
              border: "1px solid var(--border)",
            }}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
