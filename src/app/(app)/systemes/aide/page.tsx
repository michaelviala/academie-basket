import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/data";
import { SYSTEM_EDIT_ROLES, type TokenPosition } from "@/lib/systems";
import { SystemCourt } from "@/components/system-court";

const start: TokenPosition[] = [
  { label: "1", x: 50, y: 80, ball: true },
  { label: "2", x: 15, y: 25 },
  { label: "3", x: 85, y: 25 },
  { label: "4", x: 33, y: 46 },
  { label: "5", x: 66, y: 44 },
];
const moved: TokenPosition[] = [
  { label: "1", x: 38, y: 62, ball: true },
  { label: "2", x: 15, y: 25 },
  { label: "3", x: 85, y: 25 },
  { label: "4", x: 33, y: 46 },
  { label: "5", x: 66, y: 44 },
];
const passed: TokenPosition[] = moved.map((p) =>
  p.label === "1" ? { label: "1", x: p.x, y: p.y } : p.label === "5" ? { ...p, ball: true } : p,
);
const screened: TokenPosition[] = passed.map((p) =>
  p.label === "5"
    ? { label: "5", x: 52, y: 52, ball: true, screen: true }
    : p,
);

function Figure({
  children,
  caption,
}: {
  children: React.ReactNode;
  caption: string;
}) {
  return (
    <figure className="mx-auto w-full max-w-[340px] space-y-2">
      {children}
      <figcaption className="text-center text-xs" style={{ color: "var(--text-faint)" }}>
        {caption}
      </figcaption>
    </figure>
  );
}

function Step({
  n,
  title,
  children,
  figure,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
  figure?: React.ReactNode;
}) {
  return (
    <section className="card grid gap-5 md:grid-cols-[1fr_340px] md:items-center">
      <div className="space-y-2">
        <p className="display text-3xl font-bold leading-none" style={{ color: "var(--brand)" }}>
          {n}
        </p>
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="space-y-2 text-sm leading-relaxed" style={{ color: "var(--text-faint)" }}>
          {children}
        </div>
      </div>
      {figure}
    </section>
  );
}

export default async function AidePage() {
  const profile = await requireProfile();
  if (!SYSTEM_EDIT_ROLES.includes(profile.role) && profile.role !== "preparateur_physique") notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/systemes" className="text-xs" style={{ color: "var(--text-faint)" }}>
        ← Retour aux systèmes
      </Link>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--brand)" }}>
          Systèmes de jeu · Mode d&apos;emploi
        </p>
        <h1 className="display mt-1 text-3xl font-bold uppercase">Créer un système, pas à pas</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-faint)" }}>
          Un système est une suite de <b>séquences</b> : chaque séquence est une photo du jeu. L&apos;animation relie
          les photos entre elles. Tu disposes de trois outils : <b>Déplacer</b>, <b>Ballon</b> et <b>Écran</b>.
        </p>
      </div>

      <Step
        n={1}
        title="Crée le système et sa première séquence"
        figure={
          <Figure caption="Séquence 1 « Placement » : la position de départ">
            <SystemCourt positions={start} />
          </Figure>
        }
      >
        <p>
          Dans la <b>Bibliothèque</b> (colonne de gauche), clique sur <b>＋</b>, donne un nom (ex. « Horns Flare ») et
          choisis une catégorie. Le système naît avec une séquence « Placement » : cinq joueurs et le ballon chez le
          n° 1.
        </p>
        <p>
          Utilise <b>+ Attaquant</b> / <b>+ Défenseur</b> (colonne de droite) pour ajouter des joueurs, et{" "}
          <b>Retirer</b> pour supprimer celui que tu as sélectionné.
        </p>
      </Step>

      <Step
        n={2}
        title="Outil Déplacer : place les joueurs"
        figure={
          <Figure caption="Le n° 1 est en route : trait plein, cercle pointillé à l'arrivée">
            <SystemCourt
              positions={moved.map((p) => (p.label === "1" ? { ...p, x: 44, y: 71 } : p))}
              segment={{ from: start, to: moved }}
            />
          </Figure>
        }
      >
        <p>
          Avec <b>Déplacer</b> actif, glisse un joueur avec le doigt ou la souris. Tout est enregistré tout de suite.
        </p>
        <p>
          Clique sur <b>＋ Ajouter une séquence</b> : la nouvelle séquence repart des positions de la précédente. Il
          suffit alors de bouger les joueurs qui changent de place. Les flèches montrent le chemin parcouru depuis la
          séquence d&apos;avant.
        </p>
      </Step>

      <Step
        n={3}
        title="Outil Ballon : désigne qui a le ballon"
        figure={
          <Figure caption="Le ballon passe du n° 1 au n° 5 : la passe est tracée en pointillés">
            <SystemCourt
              positions={passed}
              previous={moved}
              pass={{ from: { x: 38, y: 62 }, to: { x: 66, y: 44 } }}
            />
          </Figure>
        }
      >
        <p>
          Choisis <b>Ballon</b>, puis touche le joueur qui porte le ballon dans la séquence en cours. Il n&apos;y a
          qu&apos;un porteur à la fois : toucher un autre joueur transfère le ballon, toucher le porteur le retire.
        </p>
        <p>
          Quand le porteur change d&apos;une séquence à l&apos;autre, une <b>passe</b> est dessinée automatiquement et
          le ballon voyage de l&apos;un à l&apos;autre pendant l&apos;animation.
        </p>
      </Step>

      <Step
        n={4}
        title="Outil Écran : marque un écran"
        figure={
          <Figure caption="Le n° 5 pose un écran : symbole « T » dans le sens de son déplacement">
            <SystemCourt positions={screened} previous={passed} />
          </Figure>
        }
      >
        <p>
          Choisis <b>Écran</b>, puis touche le joueur qui écrante. Un « T » apparaît devant lui, dans la direction de
          son déplacement. Touche-le à nouveau pour retirer l&apos;écran.
        </p>
        <p>
          Un écran ne vaut que pour la séquence où tu le poses : une nouvelle séquence repart sans écran.
        </p>
      </Step>

      <Step n={5} title="Lis l'animation">
        <p>
          Sous le terrain : <b>▶</b> lance la lecture, <b>⏮ ⏭</b> changent de séquence, la barre de progression se
          fait glisser à la main et la vitesse passe de 0,5× à 2×.
        </p>
        <p>
          <b>Trajectoires fluidifiées</b> choisit des déplacements courbes (naturels) ou en ligne droite. Pendant la
          lecture, les trajets sont tracés et des cercles pointillés marquent les arrivées.
        </p>
      </Step>

      <Step n={6} title="Complète et partage">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>Nom de séquence</b> (« Écran & flare ») et <b>Consignes</b> : écris qui bouge, quand et pourquoi.
          </li>
          <li>
            <b>Renommer</b> change le nom et la catégorie ; <b>Dupliquer</b> crée une variante à modifier.
          </li>
          <li>
            <b>Partagé à la catégorie</b> rend le système visible par tous les coachs.
          </li>
          <li>
            <b>Clips liés</b> : dans Vidéos, rattache un clip à ce système pour comparer le jeu réel au schéma.
          </li>
          <li>
            Dans une <b>séance</b>, choisis le système travaillé pour chaque bloc.
          </li>
        </ul>
      </Step>

      <div className="text-center">
        <Link href="/systemes" className="btn-primary">
          Aller créer un système
        </Link>
      </div>
    </div>
  );
}
