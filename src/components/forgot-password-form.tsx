"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Demande d'e-mail de réinitialisation du mot de passe. */
export function ForgotPasswordForm({ linkError = false }: { linkError?: boolean }) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(linkError ? "Ce lien de réinitialisation est invalide ou a expiré. Demande un nouveau lien ci-dessous." : null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/nouveau-mot-de-passe`,
    });
    setLoading(false);
    if (error) {
      setError("Impossible d'envoyer l'e-mail pour le moment. Réessaie dans quelques minutes.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 text-center">
        <h1 className="display text-2xl font-bold tracking-wide">MOT DE PASSE OUBLIÉ</h1>
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>
          Indique ton e-mail : tu recevras un lien pour choisir un nouveau mot de passe.
        </p>
      </div>
      {sent ? (
        <div className="card space-y-3 text-sm">
          <p className="rounded-lg px-3 py-2" style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
            E-mail envoyé à <b>{email}</b> (si un compte existe avec cette adresse). Ouvre le lien qu&apos;il contient — pense à vérifier les indésirables.
          </p>
          <a href="/login" className="block text-center text-xs hover:underline" style={{ color: "var(--brand)" }}>Retour à la connexion</a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@academie.fr" autoComplete="email" />
          </div>
          {error && (
            <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>{error}</p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Envoi…" : "Envoyer le lien"}</button>
          <a href="/login" className="block text-center text-xs hover:underline" style={{ color: "var(--text-faint)" }}>Retour à la connexion</a>
        </form>
      )}
    </div>
  );
}
