"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/data";

const ALL_ITEMS: { href: string; label: string; icon: string; roles?: Profile["role"][] }[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: "📊" },
  { href: "/joueurs", label: "Joueurs", icon: "🧑‍🤝‍🧑" },
  { href: "/equipes", label: "Équipes", icon: "🏆", roles: ["admin", "directeur_sportif", "coach"] },
  { href: "/entrainements", label: "Entraînements", icon: "🏀" },
  { href: "/matchs", label: "Matchs", icon: "📅" },
  { href: "/statistiques", label: "Statistiques", icon: "📈" },
  { href: "/rapports", label: "Rapports", icon: "📄", roles: ["admin", "directeur_sportif", "coach"] },
  { href: "/administration", label: "Administration", icon: "⚙️", roles: ["admin"] },
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
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
