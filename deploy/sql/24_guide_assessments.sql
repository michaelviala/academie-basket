-- Migration 24 : évaluation d'un joueur sur les contenus du carnet technique de sa catégorie
-- (à exécuter dans Supabase › projet Academie › SQL Editor)
create table if not exists public.guide_assessments (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  category_code text not null,                     -- ex. U11
  section text not null check (section in ('attack', 'defense')),
  item_label text not null,                        -- libellé du contenu du carnet (ex. « Tir en course »)
  status text not null check (status in ('acquis', 'en_cours', 'a_revoir')),
  comment text,
  assessed_at date not null default current_date,
  assessor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists guide_assessments_player_idx on public.guide_assessments (player_id, assessed_at desc);

alter table public.guide_assessments enable row level security;

drop policy if exists guide_assessments_select on public.guide_assessments;
create policy guide_assessments_select on public.guide_assessments
  for select using (public.can_view_player(player_id));

drop policy if exists guide_assessments_insert on public.guide_assessments;
create policy guide_assessments_insert on public.guide_assessments
  for insert with check (public.is_direction() or public.coaches_player(player_id));

drop policy if exists guide_assessments_update on public.guide_assessments;
create policy guide_assessments_update on public.guide_assessments
  for update using (public.is_direction() or public.coaches_player(player_id));

drop policy if exists guide_assessments_delete on public.guide_assessments;
create policy guide_assessments_delete on public.guide_assessments
  for delete using (public.is_direction() or public.coaches_player(player_id));

comment on table public.guide_assessments is 'Évaluations « acquis / en cours / à revoir » d''un joueur sur les contenus (attaque, défense) du carnet technique de sa catégorie. Historisé : une ligne par évaluation.';
