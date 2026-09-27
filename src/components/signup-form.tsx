"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignupForm({ logoUrl }: { logoUrl: string | null }) {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="max-w-sm text-center">
        <p className="text-lg font-semibold">Compte créé 🎉</p>
        <p className="mt-2 text-sm" style={{ color: "var(--text-faint)" }}>
          Vérifiez votre boîte mail pour confirmer votre compte, puis connectez-vous.
        </p>
        <button className="btn-primary mt-4" onClick={() => router.push("/login")}>
          Aller à la connexion
        </button>
      </div>
    );
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
        <h1 className="display text-2xl font-bold tracking-wide">Créer un compte</h1>
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>Académie Basket</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Nom complet</label>
          <input className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Mot de passe</label>
          <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {error && (
          <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Création..." : "Créer mon compte"}
        </button>
      </form>

      <p className="mt-3 text-center text-xs" style={{ color: "var(--text-faint)" }}>
        Le rôle par défaut est &quot;joueur&quot; ; un administrateur pourra l&apos;ajuster ensuite.
      </p>
    </div>
  );
}
