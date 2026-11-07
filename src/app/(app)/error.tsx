"use client";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-md space-y-3 text-center">
      <p className="display text-2xl font-bold">Oups, un problème est survenu</p>
      <p className="text-sm text-dim">
        La page n&apos;a pas pu se charger (connexion faible ou erreur temporaire). Réessaie dans un instant.
      </p>
      <div className="flex justify-center gap-2">
        <button type="button" className="btn-primary" onClick={() => retry()}>Réessayer</button>
        <a href="/dashboard" className="btn-secondary">Tableau de bord</a>
      </div>
    </div>
  );
}
