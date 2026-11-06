# Outils Panoramax — site vitrine

> Site **amateur et indépendant** : il n'est pas lié à l'organisation Panoramax. Il présente des outils
> personnels, partagés pour aider les contributeurs.

Site statique, en ligne sur **https://panoramax-tools.my-heb.eu/**, qui présente **[GeoSillage](https://github.com/qhess34/geosillage)** et
**[Pan360 FixExif](https://github.com/qhess34/pan360-fixexif)**, deux outils libres pour préparer, corriger et
publier des photos 360° sur [Panoramax](https://panoramax.fr).

Le site **ne recopie pas** la documentation des outils : il la lit à chaque construction. Une fonctionnalité
documentée dans un outil apparaît en ligne sans toucher à ce dépôt. Les **nouveautés**, elles, sont rédigées :
seules les fonctionnalités importantes y figurent, jamais les modifications techniques.

## Mettre à jour les nouveautés : `/update-site`

Dans Claude Code, la commande **`/update-site`** ([`.claude/skills/update-site`](.claude/skills/update-site/SKILL.md))
va chercher les commits des outils depuis la dernière revue (`node scripts/pending.mjs`), retient les
fonctionnalités importantes, les rédige en français dans `content/nouveautes.json`, ajuste l'accroche si besoin,
reconstruit, vérifie les liens puis publie. `/update-site --dry-run` propose les entrées sans rien publier.

## Ce qui est généré, et d'où

| Sur le site | Source (dans le dépôt de l'outil) |
|---|---|
| Cartes « Fonctionnalités » de GeoSillage | sections `##` de `doc/GUIDE_UTILISATEUR.md` (sous-sections `###` = points clés, première capture = illustration) |
| Fonctionnalités de Pan360 FixExif | tableaux et puces en gras de la section « L'interface » du `README.md` |
| « Comment ça marche » | liste numérotée de « Préparer une sortie en bref » / « Démarrage rapide » |
| Captures d'écran | toutes les images des guides, avec leur légende |
| Feuille de route (GeoSillage) | tableau « État d'avancement » du `README.md` (✅ = disponible, le reste = prochainement) |
| Raccourcis clavier | tableau dont la 1re colonne est « Touche » |
| Installation, FAQ, Bon à savoir | sections correspondantes des guides |
| Guide complet (`/<outil>/guide/`) | le guide entier, liens et images réécrits |
| Nouveautés, flux Atom | **rédigées** dans [`content/nouveautes.json`](content/nouveautes.json) : seulement les fonctionnalités importantes, par le skill `/update-site` |

Seuls l'accroche, les promesses et les textes de l'accueil sont écrits à la main, dans
[`site.config.mjs`](site.config.mjs) et [`scripts/build.mjs`](scripts/build.mjs).

## Mise à jour automatique

Le workflow [`.github/workflows/site.yml`](.github/workflows/site.yml) reconstruit et publie le site sur GitHub Pages :

- à chaque push sur `main` de ce dépôt ;
- **dès qu'un outil est poussé**, si son dépôt contient [`docs/notify-site.yml`](docs/notify-site.yml) (événement
  `repository_dispatch: tool-updated`) ;
- **toutes les 3 heures**, en comparant le dernier commit de chaque outil avec `versions.json` du site en ligne :
  rien n'est republié si rien n'a changé ;
- à la demande (*Actions → Site → Run workflow*).

### Mise en place (une seule fois)

1. **Settings → Pages → Build and deployment → Source : GitHub Actions**, puis *Custom domain* :
   `panoramax-tools.my-heb.eu` (enregistrement DNS `CNAME panoramax-tools.my-heb.eu → qhess34.github.io`),
   et cocher *Enforce HTTPS*.
2. Facultatif, pour une mise à jour immédiate plutôt que sous 3 h : dans chaque dépôt d'outil, copier
   `docs/notify-site.yml` dans `.github/workflows/`, et créer le secret `SITE_DISPATCH_TOKEN` (jeton
   *fine-grained* limité à `qhess34/panoramax-tools`, permission *Contents : Read and write*).

## Travailler en local

```sh
npm install
npm run build                       # clone les outils dans .cache/ puis génère dist/
SOURCES_DIR=.. npm run build        # ou : utilise des clones voisins (../geosillage, ../pan360-fixexif)
npm run check                       # liens internes, images et ancres
npm run serve                       # http://127.0.0.1:5600
```

`SOURCES_DIR` permet de prévisualiser une documentation d'outil avant de la pousser.

## Organisation

```
site.config.mjs        outils présentés, textes marketing, règles d'extraction
scripts/build.mjs      génération des pages (accueil, outils, guides, nouveautés, flux, plan du site)
scripts/markdown.mjs   lecture des guides : sections, rendu, extraction
scripts/sources.mjs    clone des dépôts et historique
scripts/templates.mjs  gabarit commun, illustration, blocs réutilisables
scripts/check.mjs      vérification des liens du site généré
scripts/pending.mjs    commits des outils pas encore passés en revue (pour /update-site)
content/nouveautes.json nouveautés rédigées et derniers commits revus
.claude/skills/        skill /update-site
src/assets/            style, script, favicon
```

## Ajouter un outil

Ajouter une entrée dans `tools` de `site.config.mjs` (dépôt, accroche, fichiers et sections à lire), puis
`npm run build && npm run check`. Les pages, la navigation, le flux et les nouveautés suivent.
