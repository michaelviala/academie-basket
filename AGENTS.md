<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Académie Basket

> Mémoire du projet. Tout agent (Claude Code, Codex, Cursor…) lit ce fichier avant d'agir. À tenir à jour à chaque décision importante (section « Journal »).

## 1. Le produit
Application web de **suivi du développement des joueurs** d'une académie de basket : fiches joueurs 360° (évaluations par rubrique et par type de compétence, objectifs, présences, mesures de croissance, blessures, tests physiques, vidéos), séances d'entraînement et planning, bibliothèque, systèmes de jeu, tableaux blancs tactiques, carnets techniques par catégorie, bilans PDF, administration du club.
- **Pas de matchs ni de convocations** : l'académie n'en a pas, ne pas en construire.
- Utilisateur et décideur : **Michael** (francophone, débutant en infra : expliquer simplement).

## 2. Stack
- **Next.js 16** (App Router, params/searchParams asynchrones, server actions, `proxy.ts`), React 19 (lint strict : pas d'appel impur au rendu, pas de setState dans le corps d'un effet), Tailwind 4, recharts.
- **Supabase** (projet « Academie », id `wprlqpocuvawzjvzvyyd`) : Postgres + RLS + Auth + Storage. Buckets : `club-assets`, `coach-photos`, `player-photos` (publics), `library` (privé).
- **Hébergement** : Docker sur un VPS Hostinger, `/opt/academie-basket`, derrière nginx-proxy + acme-companion (réseau `web`), site `academie.club30.cloud`.
- **Tests** : `npm test` (tests purs dans `test/*.test.ts`, via `node --experimental-strip-types`). `tsconfig` exclut `test/` (sinon le build Docker échoue). Pas de test RLS pour l'instant.

## 3. Structure
```
src/app/(app)/            pages protégées : dashboard, joueurs, seances, carnet-technique, coachs,
                          administration, videos, bibliotheque, systemes, tableaux, rapports, recherche, notifications
src/app/(app)/{loading,error,not-found}.tsx
src/app/{login,signup,manifest.ts}
src/components/           composants (client sauf mention) : nav, app-shell, player-*, whiteboard*, admin-*, guide-*, …
src/lib/                  logique pure et accès données (player-stats, attendance, whiteboard, technical-guide(-data),
                          category-color, import-players, notifications, sessions…) ; lib/supabase = clients
proxy.ts                  protection des routes (matcher : ne pas dupliquer manifest.webmanifest)
deploy/ Dockerfile docker-compose.yml .env.production.example
```
Les migrations SQL ne sont **pas** dans le dépôt : elles sont appliquées via le connecteur Supabase (MCP), numérotées (dernières : 15 gyms_details, 16 attendance_unique, 17 profiles_parcours, 18 teams_color, 19 player_measurements, 20 library_favorites, 21 library_essential, 22 library_delete_coach_admin).

## 4. Rôles et droits
Rôles : `admin`, `directeur_sportif`, `coach`, `preparateur_physique`, `joueur`, `parent`. Le rôle est lu **uniquement dans `raw_app_meta_data`** par le trigger `handle_new_user` (jamais `user_metadata`). Fonctions RLS : `is_staff()`, `is_direction()`, `coaches_team(team_id)`, `coaches_player(player_id)`, `can_view_player`, `can_view_team`. Un coach ne modifie que les joueurs de ses catégories. Liens parents (`player_guardians`) lisibles par la direction et les coachs du joueur. ⚠️ Données de mineurs : accès restreint, RGPD.

## 5. Règles de travail (obligatoires)
1. **Lire `node_modules/next/dist/docs/` avant tout code touchant le framework.**
2. **Terminer = fusionner dans `main` et pousser**, sans attendre qu'on le demande (Michael met à jour le site en continu).
3. **Chaque compte rendu rappelle la commande de mise à jour du serveur** : `cd /opt/academie-basket && git pull && docker compose up -d --build` (ajouter `npm install` si une dépendance a changé).
4. Après chaque changement : `npx tsc --noEmit`, `npx eslint`, `npm test`, puis commit en français. Messages terminés par `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` et `Claude-Session: …`.
5. Migrations : via le MCP Supabase, **puis** `get_advisors` (sécurité) et régénération de `src/types/database.ts`. Les avertissements connus (fonctions SECURITY DEFINER, protection mots de passe compromis) sont déjà acceptés.
6. **Aucun secret dans le code, git ou la conversation.** `SUPABASE_SERVICE_ROLE_KEY` uniquement dans l'environnement du VPS (sert à « Nouveau coach »).
7. Interface **en français**. Vocabulaire : « **catégorie** » (U11, U13…) et jamais « équipe » dans l'UI (les tables gardent `teams`). Menu : « **Carnets techniques** » (pluriel).
8. Expliquer simplement, dire ce que Michael doit vérifier, ne pas changer un comportement visible validé sans demander.

## 6. Décisions produit
- **Couleur unique par catégorie** : `teams.color`, définie dans Administration › Catégories (même couleur pour tous les teams de même code), reprise des carnets techniques (U11 vert, U13 bleu, U15 orange, U18 rouge). Utilisée partout via `lib/category-color.ts` et `getCategoryColors()`.
- **Évaluations** : 4 rubriques (technique, tactique, physique, mental) ; les compétences ont un type (`skills.category` : tir, dribble, finition, passe, défense, rebond, tactique, physique, mental). Fiche : cartes par rubrique, courbe de progression, **histogramme des compétences** (dernière note vs précédente), historique groupé par type de compétence avec filtre.
- **Mesures de croissance** : `player_measurements` (date + taille/poids/envergure), saisie via « Enregistrer une nouvelle mesure » ; `players.height_cm…` = dernière valeur connue ; courbes dans l'onglet Physique ; section « Croissance » dans le bilan PDF.
- **Bilan PDF** (bouton « Bilan PDF » de la fiche) : page d'impression `joueurs/[id]/rapport` (photo à gauche avec le nom, logo à droite), `window.print()`. Export PDF du **tableau blanc** : `tableaux/[id]/pdf` (A4 paysage, une page par page du tableau, avec les notes).
- **Coachs** : photo (bucket `coach-photos`), champ **Parcours** (`profiles.parcours`), création de compte via clé service.
- **Vidéo** : feedbacks vidéo limités à 12 s avec compte à rebours ; seuls les coachs commentent ; dictée vocale plutôt que saisie ; module vidéo PIVOT porté par étapes ; stockage : fichiers ≤ 50 Mo ou liens YouTube.
- **Tableau blanc** : demi-terrain / terrain complet, thèmes parquet/sombre/blanc, plein écran avec barre d'outils à droite, flèches ← → pour changer de page, **pointeur laser** (touche L), logo du club au rond central (terrain complet).
- **Bibliothèque** : favoris **personnels** (`library_favorites`, RLS : chacun ne voit que les siens) ; étoile ☆/★ sur chaque carte et dans la fiche ; onglet « ★ Favoris » en premier, la page s'ouvre dessus (sinon sur « 📌 À connaître », sinon sur « Tout »). **Documents à connaître** (nutrition, arbitrage…) : `library_items.essential`, visibles par tout le staff, marqués/démarqués par la direction seule (trigger `library_essential_guard`) ; onglet « 📌 À connaître ». **Suppression d'un document : uniquement `admin` (tout) et `coach` (ses propres documents)** — RLS `library_delete` + `canDeleteLibraryItem` ; ni directeur sportif ni préparateur physique.
- **Rôle « directeur sportif » masqué** : l'académie n'en a pas. Il n'est plus proposé (création de coach, Administration › Utilisateurs) ni cité dans les textes ; il reste en base et dans les contrôles de droits (inoffensif, réactivable).
- Import Excel/CSV joueurs + parents (Administration › Import) ; lignes sans date de naissance valide ignorées (`birth_date` obligatoire).
- Notifications : seulement feedback de séance (joueur) et blessure déclarée (direction/prépa physique). Page peu utile en l'état : à enrichir ou à retirer.

## 7. Reste à faire / points ouverts
- **Tests des droits d'accès (RLS)**, surtout données de mineurs — prioritaire.
- Envoi groupé (e-mail) aux parents d'une catégorie.
- Découper `src/components/video-editor.tsx` (1 442 lignes).
- Boutons plus grands pour le tactile en salle ; pages vides avec bouton d'action partout ; comparaison à la moyenne de la catégorie sur les courbes de la fiche.
- Vérifier côté Michael : `SUPABASE_SERVICE_ROLE_KEY` sur le VPS, sauvegardes Supabase (Database › Backups), problème caméra intégrée sur Android (segments précédents), son fichier Excel de joueurs réel.
- Historique des mesures déjà en place ; envisager un historique pour d'autres données si besoin.

## 8. Journal
- 2026-11 : nouveau projet Supabase « Academie » ; refonte UI inspirée de PIVOT ; Administration (logo, couleur du club).
- 2026-11-07 : revue complète du site et réalisation des propositions (thème, chargement/erreur, appel de présence, tableaux de bord coach/direction/parent, PWA et menu groupé, recherche, import Excel, rôles, bilan PDF).
- 2026-11-07 : tableau blanc (plein écran, laser, logo, export PDF avec notes) ; « équipe » → « catégorie » ; coach : photo + parcours ; couleur unique par catégorie ; « Carnets techniques » ; mesures de croissance avec historique ; évaluations par type de compétence + histogramme ; bouton « Bilan PDF ».
- 2026-11-08 : Bibliothèque : favoris personnels (étoile, onglet Favoris ouvert par défaut), migration 20.
- 2026-11-08 : Bibliothèque : « 📌 À connaître » (documents communs choisis par la direction), migration 21.
- 2026-11-08 : Bibliothèque : suppression réservée à l'admin et aux coachs (auteur), migration 22.
- 2026-11-08 : rôle « directeur sportif » masqué de l'interface (conservé en base).
