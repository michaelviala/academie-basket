"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/password-input";

export function LoginForm({ logoUrl }: { logoUrl: string | null }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("Identifiants incorrects. Vérifiez votre email et votre mot de passe, ou utilisez « Mot de passe oublié ? ». Pas encore de compte ? Créez-le ci-dessous.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt="Logo du club"
            className="mx-auto mb-3 h-12 w-12 rounded-xl object-cover"
          />
        ) : (
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold text-white"
            style={{ background: "var(--brand)" }}
          >
            🏀
          </div>
        )}
        <h1 className="display text-2xl font-bold tracking-wide">ACADÉMIE BASKET</h1>
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>Suivi de la progression des joueurs</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom.nom@academie.fr"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">Mot de passe</label>
            <a href="/mot-de-passe-oublie" className="text-xs hover:underline" style={{ color: "var(--text-faint)" }}>
              Mot de passe oublié ?
            </a>
          </div>
          <PasswordInput
            id="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p
            className="rounded-lg px-3 py-2 text-sm"
            style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}
          >
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs" style={{ color: "var(--text-faint)" }}>
        Accès réservé au staff, joueurs et parents de l&apos;académie.
      </p>
      <p className="mt-2 text-center text-xs">
        <a href="/signup" className="font-medium hover:underline" style={{ color: "var(--brand)" }}>
          Créer un compte
        </a>
      </p>
    </div>
  );
}
