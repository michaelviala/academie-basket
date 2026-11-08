import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { LIBRARY_EDIT_ROLES, youtubeId, type LibraryItem } from "@/lib/library";
import { LibraryBrowser } from "@/components/library-browser";

export default async function BibliothequePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("library_items")
    .select(
      "id, kind, title, description, tags, essential, file_path, thumbnail_path, file_name, file_size, mime_type, video_url, start_seconds, end_seconds, created_at, created_by",
    )
    .order("created_at", { ascending: false })
    .limit(1000);

  const items = rows ?? [];

  // Favoris de l'utilisateur connecté (si la lecture échoue, la bibliothèque reste utilisable)
  const { data: favRows } = await supabase
    .from("library_favorites")
    .select("item_id")
    .eq("user_id", profile.id);
  const favorites = new Set((favRows ?? []).map((f) => f.item_id));

  // Liens temporaires (1 h) vers les fichiers hébergés
  const paths = items
    .flatMap((r) => [r.file_path, r.thumbnail_path])
    .filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data } = await supabase.storage
      .from("library")
      .createSignedUrls(paths, 3600);
    data?.forEach((s) => {
      if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
    });
  }

  const authorIds = Array.from(
    new Set(items.map((r) => r.created_by).filter((v): v is string => !!v)),
  );
  const authors = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", authorIds);
    data?.forEach((a) => authors.set(a.id, a.full_name));
  }

  const isDirection = ["admin", "directeur_sportif"].includes(profile.role);
  const list: LibraryItem[] = items.map((r) => ({
    id: r.id,
    kind: r.kind === "video" ? "video" : "document",
    title: r.title,
    description: r.description,
    tags: r.tags ?? [],
    file_name: r.file_name,
    file_size: r.file_size,
    mime_type: r.mime_type,
    video_url: r.video_url,
    start_seconds: r.start_seconds,
    end_seconds: r.end_seconds,
    created_at: r.created_at,
    created_by: r.created_by,
    thumbUrl: r.thumbnail_path
      ? (signed.get(r.thumbnail_path) ?? null)
      : youtubeId(r.video_url)
        ? `https://i.ytimg.com/vi/${youtubeId(r.video_url)}/hqdefault.jpg`
        : null,
    hasStoredThumb: !!r.thumbnail_path,
    signedUrl: r.file_path ? (signed.get(r.file_path) ?? null) : null,
    author: r.created_by ? (authors.get(r.created_by) ?? null) : null,
    canDelete: isDirection || r.created_by === profile.id,
    isFavorite: favorites.has(r.id),
    essential: r.essential,
    canMarkEssential: isDirection,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-3xl font-bold uppercase">Bibliothèque</h1>
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>
          Documents et séquences vidéo du club. Tes favoris ★ et les documents à connaître 📌 sont en tête.
        </p>
      </div>
      <LibraryBrowser
        items={list}
        canAdd={LIBRARY_EDIT_ROLES.includes(profile.role)}
      />
    </div>
  );
}
