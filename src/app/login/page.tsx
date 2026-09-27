import { getClubSettings, darkenHex } from "@/lib/data";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const settings = await getClubSettings();

  const brandVars = {
    "--brand": settings.brand_color,
    "--brand-dark": darkenHex(settings.brand_color),
    "--bg": settings.bg_color,
    background: settings.bg_color,
  } as React.CSSProperties;

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={brandVars}>
      <LoginForm logoUrl={settings.logo_url} />
    </div>
  );
}
