"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/data";

export type IconName = "home" | "users" | "trophy" | "video" | "clip" | "bell" | "notebook" | "whistle" | "file" | "settings" | "library" | "play" | "board";

export function Icon({ name }: { name: IconName }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 9.5V20h13V9.5" />
          <path d="M10 20v-6h4v6" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 20c0-3.6 2.7-6 5.5-6s5.5 2.4 5.5 6" />
          <path d="M16 8.2a3 3 0 1 1 3.2 3" />
          <path d="M15 14.3c2.6.3 4.9 2.4 5.5 5.7" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...common}>
          <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
          <path d="M7 5H4v2a3.5 3.5 0 0 0 3.2 3.5" />
          <path d="M17 5h3v2a3.5 3.5 0 0 1-3.2 3.5" />
          <path d="M10.5 15h3v3h-3z" />
          <path d="M8.5 20h7" />
        </svg>
      );
    case "video":
      return (
        <svg {...common}>
          <rect x="3" y="6" width="12" height="12" rx="2" />
          <path d="M15 10.5 21 7v10l-6-3.5Z" />
        </svg>
      );
    case "clip":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M10 8.5v7l6-3.5-6-3.5Z" />
        </svg>
      );
    case "notebook":
      return (
        <svg {...common}>
          <path d="M6 3.5h11a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
          <path d="M9 3.5V21M9 8h6M9 12h6M9 16h4" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6 17V11a6 6 0 1 1 12 0v6l1.5 2.5h-15L6 17Z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
      );
    case "whistle":
      return (
        <svg {...common}>
          <circle cx="9" cy="15" r="4.2" />
          <path d="M12.8 12.2 20 6" />
          <path d="M20 6h-3.2V3.5" />
          <path d="M9 15h.01" />
        </svg>
      );
    case "file":
      return (
        <svg {...common}>
          <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
          <path d="M14 3.5V8h4" />
          <path d="M9 13h6M9 16.5h6" />
        </svg>
      );
    case "library":
      return (
        <svg {...common}>
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H9v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" />
          <path d="M9 4h4v16H9z" />
          <path d="m14.2 5.2 3.4-1.1 3 14.6-3.4.9-3-14.4Z" />
        </svg>
      );
    case "play":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8" cy="15" r="1.6" />
          <path d="M10 14c3-1 4-4 8-5" strokeDasharray="2 2" />
          <path d="m16 7 2.5 2L16 11" />
        </svg>
      );
    case "board":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 12h18M12 4v16" />
          <circle cx="12" cy="12" r="2.6" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4" />
        </svg>
      );
  }
}

export type NavGroup = "suivi" | "outils" | "club";
export const NAV_GROUPS: Record<NavGroup, string> = { suivi: "Suivi", outils: "Vidéo & tactique", club: "Club" };

export const ALL_ITEMS: { href: string; label: string; icon: IconName; roles?: Profile["role"][]; group: NavGroup }[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: "home", group: "suivi" },
  { href: "/joueurs", label: "Joueurs", icon: "users", group: "suivi" },
  { href: "/carnet-technique", label: "Carnet technique", icon: "notebook", group: "suivi" },
  { href: "/seances", label: "Séances", icon: "video", group: "suivi" },
  { href: "/notifications", label: "Notifications", icon: "bell", group: "suivi" },
  { href: "/bibliotheque", label: "Bibliothèque", icon: "library", roles: ["admin", "directeur_sportif", "coach", "preparateur_physique"], group: "outils" },
  { href: "/systemes", label: "Systèmes", icon: "play", roles: ["admin", "directeur_sportif", "coach", "preparateur_physique"], group: "outils" },
  { href: "/videos", label: "Vidéos", icon: "clip", group: "outils" },
  { href: "/tableaux", label: "Tableau blanc", icon: "board", roles: ["admin", "directeur_sportif", "coach", "preparateur_physique", "joueur"], group: "outils" },
  { href: "/coachs", label: "Coachs", icon: "whistle", roles: ["admin", "directeur_sportif"], group: "club" },
  { href: "/rapports", label: "Rapports", icon: "file", roles: ["admin", "directeur_sportif", "coach"], group: "club" },
  { href: "/administration", label: "Administration", icon: "settings", roles: ["admin"], group: "club" },
];

export function Nav({ role, unreadNotifications = 0 }: { role: Profile["role"]; unreadNotifications?: number }) {
  const pathname = usePathname();
  const items = ALL_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <nav className="flex flex-col gap-1 px-3">
      <form action="/recherche" role="search" className="px-1 pb-1">
        <input
          name="q"
          type="search"
          placeholder="Rechercher…"
          aria-label="Rechercher"
          className="input"
          style={{ padding: "7px 10px", fontSize: 13 }}
        />
      </form>
      {(Object.keys(NAV_GROUPS) as NavGroup[]).map((g) => {
        const list = items.filter((i) => i.group === g);
        if (list.length === 0) return null;
        return (
          <div key={g} className="flex flex-col gap-1">
            <p className="px-3 pb-0.5 pt-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>{NAV_GROUPS[g]}</p>
            {list.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href} className={`nav-link ${active ? "active" : ""}`}>
                  <Icon name={item.icon} />
                  <span className="flex-1">{item.label}</span>
                  {item.icon === "bell" && unreadNotifications > 0 && (
                    <span
                      className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white"
                      style={{ background: "var(--brand)" }}
                    >
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
