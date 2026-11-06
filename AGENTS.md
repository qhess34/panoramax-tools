# AGENTS.md

Consignes pour les agents (IA ou humains) qui modifient ce dépôt. Lire aussi le [README](README.md).

## Rôle du dépôt

Site vitrine (marketing) de GeoSillage et Pan360 FixExif, **généré** depuis la documentation des outils.
Le contenu technique vient des dépôts des outils ; ce dépôt ne contient que l'accroche, la mise en page et les règles
d'extraction.

## Règles

1. **Ne pas recopier la documentation des outils** dans ce dépôt. Si une fonctionnalité manque sur le site, la
   corriger à la source (guide de l'outil) ou corriger l'extraction (`scripts/markdown.mjs`, `site.config.mjs`).
2. Quand un outil change la structure de sa doc (titre de section renommé, tableau déplacé), adapter les
   expressions régulières de `site.config.mjs` ; le build doit rester sans erreur et `npm run check` vert.
3. **Langue** : français pour le site, les messages et les commentaires.
4. **Aucune dépendance d'exécution côté navigateur** : HTML/CSS/JS statiques, pas de CDN. Côté build, seulement
   `marked` (version exacte dans `package.json`).
5. Le site doit rester lisible sans défilement horizontal de 360 px à 1440 px, en thème clair et sombre.
6. Le site est **amateur et indépendant** de l'organisation Panoramax : ne jamais laisser croire le contraire
   (pas de logo Panoramax, pas de « officiel », garder la mention dans le pied de page et l'accueil).
7. Les textes marketing (accroche, promesses) doivent rester vrais : les vérifier dans le guide de l'outil.

## Publication

Le propriétaire autorise la fusion dans `main` **sans demander de confirmation** : une fois `npm run build` et
`npm run check` au vert, pousser la branche de travail puis l'envoyer sur `main` (avance rapide) pour publier.

## Vérifier une modification

```sh
npm run build && npm run check
npm run serve   # puis contrôler l'accueil, une page outil, un guide et les nouveautés, aussi en largeur 390 px
```

## Quand un outil reçoit une nouvelle fonctionnalité

Le workflow `Site` régénère les pages tirées de la doc (push de l'outil, ou vérification toutes les 3 h).
Les nouveautés, elles, sont rédigées : suivre le skill [`/update-site`](.claude/skills/update-site/SKILL.md)
(uniquement les fonctionnalités importantes, jamais les modifications techniques).
