import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/data";
import { getTechnicalGuide } from "@/lib/technical-guide-data";
import { GUIDE_EDIT_ROLES } from "@/lib/technical-guide";
import { GuideEditor } from "@/components/guide-editor";

export default async function ModifierCahierTechniquePage() {
  const profile = await requireProfile();
  if (!(GUIDE_EDIT_ROLES as readonly string[]).includes(profile.role)) {
    redirect("/carnet-technique");
  }

  const { guide } = await getTechnicalGuide();
  return <GuideEditor initial={guide} />;
}
