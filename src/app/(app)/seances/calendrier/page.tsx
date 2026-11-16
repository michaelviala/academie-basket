import { redirect } from "next/navigation";

/** Ancienne adresse du calendrier : désormais une rubrique à part entière. */
export default function CalendrierPage() {
  redirect("/calendrier");
}
