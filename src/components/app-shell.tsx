"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ALL_ITEMS, Icon } from "@/components/nav";
import type { Profile } from "@/lib/data";

/** Barre du bas : les 4 accès les plus utilisés sur téléphone + « Menu » (tiroir complet). */
const BOTTOM = ["/dashboard", "/joueurs", "/seances", "/carnet-technique"];

export function AppShell({
  sidebar,
  role,
  logoUrl,
  unread,
  children,
}: {
  sidebar: React.ReactNode;
  role: Profile["role"];
  logoUrl: string | null;
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // le tiroir est lié à la page où il a été ouvert : il se ferme donc à chaque navigation
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (v: boolean) => setOpenedOn(v ? pathname : null);
  // pas de défilement de la page derrière le tiroir
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const items = ALL_ITEMS.filter((i) => (!i.roles || i.roles.includes(role)) && BOTTOM.includes(i.href));
  const bell = ALL_ITEMS.find((i) => i.href === "/notifications");

  return (
    <div className="shell">
      <header className="topbar">
        <button type="button" className="topbar-btn" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-7 w-7 rounded-md object-cover" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-md text-sm" style={{ background: "var(--brand)" }}>
              🏀
            </span>
          )}
          <span className="display truncate text-base font-bold tracking-wide">ACADÉMIE BASKET</span>
        </div>
        {bell && (
          <Link href={bell.href} className="topbar-btn relative" aria-label="Notifications">
            <Icon name="bell" />
            {unread > 0 && (
              <span
                className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                style={{ background: "var(--brand)" }}
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        )}
      </header>

      {open && <div className="side-overlay" onClick={() => setOpen(false)} aria-hidden />}
      <aside className={`side ${open ? "open" : ""}`}>
        <button type="button" className="side-close topbar-btn" onClick={() => setOpen(false)} aria-label="Fermer le menu">
          ×
        </button>
        {sidebar}
      </aside>

      <main className="main">{children}</main>

      <nav className="bottombar" aria-label="Navigation principale">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} className={`bottom-link ${active ? "active" : ""}`}>
              <Icon name={item.icon} />
              <span>{item.label === "Tableau de bord" ? "Accueil" : item.label === "Séances" ? "Séances" : item.label === "Carnet technique" ? "Carnet" : item.label}</span>
            </Link>
          );
        })}
        <button type="button" className="bottom-link" onClick={() => setOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}
