import { getClubSettings, darkenHex } from "@/lib/data";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const [settings, sp] = await Promise.all([getClubSettings(), searchParams]);
  const brandVars = {
    "--brand": settings.brand_color,
    "--brand-dark": darkenHex(settings.brand_color),
    "--bg": settings.bg_color,
    background: settings.bg_color,
  } as React.CSSProperties;
  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={brandVars}>
      <ForgotPasswordForm linkError={sp.erreur === "lien"} />
    </div>
  );
}
