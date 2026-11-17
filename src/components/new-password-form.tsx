"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/password-input";

/** Choix d'un nouveau mot de passe (après le lien reçu par e-mail, ou depuis le compte). */
export function NewPasswordForm() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("8 caractères minimum.");
    if (password !== confirm) return setError("Les deux mots de passe ne sont pas identiques.");
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(/weak|pwned|compromised/i.test(error.message) ? "Ce mot de passe est trop faible ou connu dans des fuites de données : choisis-en un autre." : "Impossible de changer le mot de passe : le lien a peut-être expiré. Recommence depuis « Mot de passe oublié ».");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 text-center">
        <h1 className="display text-2xl font-bold tracking-wide">NOUVEAU MOT DE PASSE</h1>
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>Choisis un mot de passe d&apos;au moins 8 caractères.</p>
      </div>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="pw">Nouveau mot de passe</label>
          <PasswordInput id="pw" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <div>
          <label className="label" htmlFor="pw2">Confirmation</label>
          <PasswordInput id="pw2" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </div>
        {error && (
          <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>{error}</p>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Enregistrement…" : "Enregistrer le mot de passe"}</button>
      </form>
    </div>
  );
}
