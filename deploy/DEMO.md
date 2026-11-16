# Instance de démonstration (demo.club30.cloud)

Même code que la production, mais reliée au projet Supabase « Academie » (`wprlqpocuvawzjvzvyyd`),
qui contient des données fictives (13 joueurs, évaluations, séances…). La production utilise le projet
« academie3 » (`hmtfpjkarphahiiffkfx`).

## Comptes de démonstration (mot de passe commun : `Demo2026!`)
| Rôle   | E-mail               | Détail                                   |
|--------|----------------------|------------------------------------------|
| Admin  | admin@demo.academie  | Direction, accès complet                 |
| Coach  | coach@demo.academie  | Coach de la catégorie U13                |
| Joueur | joueur@demo.academie | Relié à la fiche de Lucas Bernard (U11)  |
| Parent | parent@demo.academie | Parent de Lucas Bernard                  |

## Mise en place sur le VPS (une fois)
```bash
cd /opt
git clone https://github.com/michaelviala/academie-basket.git academie-demo
cd academie-demo
cp /opt/academie-basket/.env .env        # reprend les clés actuelles (projet « Academie » = démo)
sed -i 's/^VIRTUAL_HOST=.*/VIRTUAL_HOST=demo.club30.cloud/' .env
grep -q '^CONTAINER_NAME=' .env || echo 'CONTAINER_NAME=academie-demo' >> .env
docker compose up -d --build
```
Avant cela : ajouter dans le DNS de club30.cloud un enregistrement `A demo → 179.198.211.113`
(même IP que `academie`). Le proxy partagé obtient le certificat HTTPS tout seul.

## Mise à jour de la démo
```bash
cd /opt/academie-demo && git pull && docker compose up -d --build
```

## Remettre la démo à zéro
Les données de démo vivent dans Supabase ; une réinitialisation se fait en base (pas de script pour l'instant).
