import { requireProfile, ROLE_LABELS, getClubSettings, darkenHex } from "@/lib/data";
import { Nav } from "@/components/nav";
import { LogoutButton } from "@/components/logout-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [profile, settings] = await Promise.all([requireProfile(), getClubSettings()]);

  const brandVars = {
    "--brand": settings.brand_color,
    "--brand-dark": darkenHex(settings.brand_color),
    "--bg": settings.bg_color,
    "--side-bg": settings.sidebar_color,
    background: settings.bg_color,
  } as React.CSSProperties;

  return (
    <div className="shell" style={brandVars}>
      <aside className="side">
        <div className="flex items-center gap-3 px-4 py-5">
          {settings.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logo_url}
              alt="Logo du club"
              className="h-9 w-9 rounded-lg object-cover"
            />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-white"
              style={{ background: "var(--brand)" }}
            >
              🏀
            </div>
          )}
          <div className="min-w-0">
            <p className="display text-sm font-bold leading-none tracking-wide">ACADÉMIE BASKET</p>
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
              {ROLE_LABELS[profile.role]}
            </p>
          </div>
        </div>
        <Nav role={profile.role} />
        <div className="mt-auto border-t px-4 py-4" style={{ borderColor: "var(--border)" }}>
          <p className="truncate text-sm font-medium">{profile.full_name}</p>
          <div className="mt-2">
            <LogoutButton />
          </div>
        </div>
      </aside>
      <main className="main">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
