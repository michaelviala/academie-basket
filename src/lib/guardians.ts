/** Parents / responsables légaux d'un joueur : types et nettoyage (fonctions pures). */

export const RELATIONSHIPS = [
  { value: "mere", label: "Mère" },
  { value: "pere", label: "Père" },
  { value: "tuteur", label: "Tuteur / tutrice" },
  { value: "autre", label: "Autre" },
] as const;
export type Relationship = (typeof RELATIONSHIPS)[number]["value"];

export const relationshipLabel = (v: string) => RELATIONSHIPS.find((r) => r.value === v)?.label ?? "Autre";

export type Guardian = {
  id: string;
  playerId: string;
  fullName: string;
  relationship: Relationship;
  email: string;
  phone: string;
  isPrimary: boolean;
  notes: string;
};

export type GuardianInput = Omit<Guardian, "id">;

/** Retourne les données nettoyées, ou un message d'erreur en français. */
export function cleanGuardian(i: GuardianInput): { ok: GuardianInput } | { error: string } {
  const fullName = i.fullName.trim().replace(/\s+/g, " ");
  if (!fullName) return { error: "Le nom du parent est obligatoire." };
  if (fullName.length > 120) return { error: "Nom trop long (120 caractères max)." };
  const email = i.email.trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Adresse e-mail invalide." };
  const phone = i.phone.trim().replace(/\s+/g, " ");
  if (phone && !/^[+\d][\d .()\-]{5,28}$/.test(phone)) return { error: "Numéro de téléphone invalide (chiffres, espaces, + . - ( ) uniquement)." };
  const relationship: Relationship = RELATIONSHIPS.some((r) => r.value === i.relationship) ? i.relationship : "autre";
  return { ok: { playerId: i.playerId, fullName, relationship, email, phone, isPrimary: !!i.isPrimary, notes: i.notes.trim().slice(0, 500) } };
}
