"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/data";

type IconName = "home" | "users" | "trophy" | "video" | "clip" | "whistle" | "file" | "settings";

function Icon({ name }: { name: IconName }) {
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
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4" />
        </svg>
      );
  }
}

const ALL_ITEMS: { href: string; label: string; icon: IconName; roles?: Profile["role"][] }[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: "home" },
  { href: "/joueurs", label: "Joueurs", icon: "users" },
  { href: "/equipes", label: "Équipes", icon: "trophy", roles: ["admin", "directeur_sportif", "coach"] },
  { href: "/entrainements", label: "Entraînements", icon: "video" },
  { href: "/videos", label: "Vidéos", icon: "clip" },
  { href: "/coachs", label: "Coachs", icon: "whistle", roles: ["admin", "directeur_sportif"] },
  { href: "/rapports", label: "Rapports", icon: "file", roles: ["admin", "directeur_sportif", "coach"] },
  { href: "/administration", label: "Administration", icon: "settings", roles: ["admin"] },
];

export function Nav({ role }: { role: Profile["role"] }) {
  const pathname = usePathname();
  const items = ALL_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link key={item.href} href={item.href} className={`nav-link ${active ? "active" : ""}`}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
