import { requireProfile, ROLE_LABELS } from "@/lib/data";
import { Nav } from "@/components/nav";
import { LogoutButton } from "@/components/logout-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  return (
    <div className="shell">
      <aside className="side">
        <div className="flex items-center gap-3 px-4 py-5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-white"
            style={{ background: "var(--brand)" }}
          >
            🏀
          </div>
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
