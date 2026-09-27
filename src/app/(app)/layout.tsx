import { requireProfile, ROLE_LABELS } from "@/lib/data";
import { Nav } from "@/components/nav";
import { LogoutButton } from "@/components/logout-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 text-lg text-white">
              🏀
            </div>
            <div>
              <p className="text-sm font-bold leading-none">Académie Basket</p>
              <p className="text-xs text-slate-400">{ROLE_LABELS[profile.role]}</p>
            </div>
          </div>
          <Nav role={profile.role} />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">{profile.full_name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
