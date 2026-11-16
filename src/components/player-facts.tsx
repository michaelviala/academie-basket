/** Encadrés taille / poids / envergure / main / entrée / ancien club de la fiche joueur (la saisie passe par le menu ⚙ de la fiche). */

type Props = {
  entry: string;
  height: number | null;
  weight: number | null;
  wingspan: number | null;
  hand: string | null;
  previousClub: string | null;
};

export function PlayerFacts({ entry, height, weight, wingspan, hand, previousClub }: Props) {
  const facts = [
    { label: "Taille", value: height ? `${height} cm` : "—" },
    { label: "Poids", value: weight ? `${weight} kg` : "—" },
    { label: "Envergure", value: wingspan ? `${wingspan} cm` : "—" },
    { label: "Main", value: hand ?? "—" },
    { label: "Entrée", value: entry },
    { label: "Ancien club", value: previousClub ?? "—" },
  ];

  return (
    <div className="mt-6">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {facts.map((f) => (
          <div key={f.label} className="rounded-lg px-3 py-2" style={{ background: "var(--surf)", border: "1px solid var(--border)" }}>
            <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>{f.label}</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold capitalize">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
