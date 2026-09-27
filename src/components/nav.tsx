"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/data";

const ALL_ITEMS: { href: string; label: string; roles?: Profile["role"][] }[] = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/joueurs", label: "Joueurs" },
  { href: "/equipes", label: "Équipes", roles: ["admin", "directeur_sportif", "coach"] },
  { href: "/entrainements", label: "Entraînements" },
  { href: "/matchs", label: "Matchs" },
  { href: "/statistiques", label: "Statistiques" },
  { href: "/rapports", label: "Rapports", roles: ["admin", "directeur_sportif", "coach"] },
  { href: "/administration", label: "Administration", roles: ["admin"] },
];

export function Nav({ role }: { role: Profile["role"] }) {
  const pathname = usePathname();
  const items = ALL_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <nav className="flex flex-wrap gap-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-orange-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
