-- Migration 25 (appliquée le 2026-11-16 via le connecteur Supabase)
alter table public.seasons add column if not exists archived boolean not null default false;
comment on column public.seasons.archived is 'Saison archivée : conservée pour l''historique, plus proposée dans les formulaires';
