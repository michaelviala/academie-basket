import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-md space-y-3 text-center">
      <p className="display text-2xl font-bold">Page introuvable</p>
      <p className="text-sm text-dim">
        Cette page n&apos;existe pas, ou tu n&apos;as pas le droit de la consulter.
      </p>
      <Link href="/dashboard" className="btn-primary inline-flex">Retour au tableau de bord</Link>
    </div>
  );
}
