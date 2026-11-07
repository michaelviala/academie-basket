import { requireProfile } from "@/lib/data";
import { getTechnicalGuide } from "@/lib/technical-guide-data";
import { GUIDE_EDIT_ROLES } from "@/lib/technical-guide";
import { GuideView } from "@/components/guide-view";

export default async function CarnetTechniquePage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const profile = await requireProfile();
  const canEdit = (GUIDE_EDIT_ROLES as readonly string[]).includes(profile.role);
  const { guide, updatedAt, updatedBy } = await getTechnicalGuide();

  return <GuideView guide={guide} activeCode={cat} canEdit={canEdit} updatedAt={updatedAt} updatedBy={updatedBy} />;
}
