import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClubSettings, requireProfile } from "@/lib/data";
import { WB_EDIT_ROLES, parsePages } from "@/lib/whiteboard";
import { WbStatic } from "@/components/whiteboard-scene";
import { PrintButton } from "@/components/print-button";

export default async function TableauPdfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  if (![...WB_EDIT_ROLES, "preparateur_physique", "joueur"].includes(profile.role)) notFound();
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("whiteboards")
    .select("id, title, description, court, theme, team_id, pages, teams(name)")
    .eq("id", id)
    .maybeSingle();
  if (!row) notFound();

  const settings = await getClubSettings();
  const court = row.court === "full" ? "full" : "half";
  const theme = row.theme === "sombre" || row.theme === "blanc" ? row.theme : "parquet";
  const pages = parsePages(row.pages, court);
  const teamName = (row.teams as { name: string } | null)?.name ?? "Tout le club";
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href={`/tableaux/${id}`} className="text-xs text-faint">← Retour au tableau</Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-faint">Dans la fenêtre d&apos;impression, choisis « Enregistrer au format PDF » (orientation paysage).</span>
          <PrintButton />
        </div>
      </div>

      {pages.map((pg, i) => (
        <section key={pg.id} className={`wb-sheet ${court === "half" ? "wb-half" : "wb-full"}`}>
          <header className="wb-head">
            <div className="flex items-center gap-3">
              {settings.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logo_url} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6 }} />
              )}
              <div>
                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: "#777" }}>Académie Basket · Tableau tactique</p>
                <h1 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.15 }}>{row.title}</h1>
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 12, color: "#555" }}>
              <p>{teamName}</p>
              <p>{today} · page {i + 1}/{pages.length}</p>
            </div>
          </header>
          {i === 0 && row.description && <p style={{ fontSize: 13, color: "#444", margin: "6px 0" }}>{row.description}</p>}
          <h2 className="wb-ptitle">{pg.title}</h2>
          <div className="wb-body">
            <div className="wb-court">
              <WbStatic court={court} theme={theme} els={pg.els} uid={`pdf${i}-`} label={`${row.title} — ${pg.title}`} logoUrl={settings.logo_url} />
            </div>
            <div className="wb-note">
              <h3>Notes</h3>
              {pg.note ? <p style={{ whiteSpace: "pre-line" }}>{pg.note}</p> : <p style={{ color: "#999" }}>Aucune note pour cette page.</p>}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
