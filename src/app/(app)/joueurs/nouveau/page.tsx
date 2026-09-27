import { createClient } from "@/lib/supabase/server";
import { createPlayer } from "./actions";

export default async function NouveauJoueurPage() {
  const supabase = await createClient();
  const [{ data: teams }, { data: seasons }] = await Promise.all([
    supabase.from("teams").select("id, name, category").order("name"),
    supabase.from("seasons").select("id, label").order("start_date", { ascending: false }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Nouveau joueur</h1>

      <form action={createPlayer} className="card grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Prénom *</label>
          <input className="input" name="first_name" required />
        </div>
        <div>
          <label className="label">Nom *</label>
          <input className="input" name="last_name" required />
        </div>
        <div>
          <label className="label">Date de naissance *</label>
          <input className="input" type="date" name="birth_date" required />
        </div>
        <div>
          <label className="label">Numéro de maillot</label>
          <input className="input" type="number" name="jersey_number" />
        </div>
        <div>
          <label className="label">Taille (cm)</label>
          <input className="input" type="number" step="0.1" name="height_cm" />
        </div>
        <div>
          <label className="label">Poids (kg)</label>
          <input className="input" type="number" step="0.1" name="weight_kg" />
        </div>
        <div>
          <label className="label">Envergure (cm)</label>
          <input className="input" type="number" step="0.1" name="wingspan_cm" />
        </div>
        <div>
          <label className="label">Main dominante</label>
          <select className="input" name="dominant_hand" defaultValue="">
            <option value="">—</option>
            <option value="droite">Droite</option>
            <option value="gauche">Gauche</option>
            <option value="ambidextre">Ambidextre</option>
          </select>
        </div>
        <div>
          <label className="label">Poste principal</label>
          <input className="input" name="primary_position" placeholder="Meneur, Ailier..." />
        </div>
        <div>
          <label className="label">Poste secondaire</label>
          <input className="input" name="secondary_position" />
        </div>
        <div>
          <label className="label">Équipe</label>
          <select className="input" name="team_id" defaultValue="">
            <option value="">—</option>
            {teams?.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Saison</label>
          <select className="input" name="season_id" defaultValue="">
            <option value="">—</option>
            {seasons?.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Date d&apos;entrée dans l&apos;académie</label>
          <input className="input" type="date" name="entry_date" />
        </div>
        <div>
          <label className="label">Ancien club</label>
          <input className="input" name="previous_club" />
        </div>

        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary">Créer la fiche joueur</button>
        </div>
      </form>
    </div>
  );
}
