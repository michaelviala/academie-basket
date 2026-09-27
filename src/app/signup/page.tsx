import { getClubSettings, darkenHex } from "@/lib/data";
import { SignupForm } from "@/components/signup-form";

export default async function SignupPage() {
  const settings = await getClubSettings();

  const brandVars = {
    "--brand": settings.brand_color,
    "--brand-dark": darkenHex(settings.brand_color),
    "--bg": settings.bg_color,
    background: settings.bg_color,
  } as React.CSSProperties;

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={brandVars}>
      <SignupForm logoUrl={settings.logo_url} />
    </div>
  );
}
