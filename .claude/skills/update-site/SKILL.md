---
name: update-site
description: Met à jour le site vitrine Outils Panoramax (panoramax-tools.my-heb.eu) à partir des dépôts de GeoSillage et Pan360 FixExif — recherche les nouveautés depuis la dernière revue, rédige les nouvelles fonctionnalités importantes dans content/nouveautes.json, met à jour l'accroche si besoin, reconstruit, vérifie et publie. À utiliser quand on demande de mettre à jour le site, d'ajouter les nouveautés des applis, ou via /update-site.
---

# /update-site — mettre à jour le site avec les nouveautés des outils

Le site est généré depuis la documentation des outils (fonctionnalités, guide, captures, raccourcis : rien à
faire pour ces parties). Ce skill s'occupe de ce qui demande du jugement : **les nouveautés**, et
l'accroche marketing quand une fonctionnalité majeure arrive.

Arguments facultatifs : un nom d'outil (`geosillage`, `pan360-fixexif`) pour n'en traiter qu'un ; `--dry-run`
pour proposer les nouveautés sans committer.

## 1. Récupérer ce qui a changé

Le dernier commit revu de chaque outil est dans `content/derniere-revue.json` (clé = dépôt, `sha` et `date`).
On ne relit que les commits postérieurs à ce sha, jamais l'historique entier.

```sh
for r in geosillage pan360-fixexif; do
  [ -d .cache/$r/.git ] || git clone --quiet --filter=blob:none --no-checkout https://github.com/qhess34/$r.git .cache/$r
  git -C .cache/$r fetch --quiet origin
done
```

Pour chaque outil (dépôt `qhess34/<outil>`, sha lu dans `derniere-revue.json`) :

```sh
git -C .cache/<outil> log --format='%h %s' <sha>..origin/main
```

- Si la liste est vide pour tous les outils : dire « Rien de nouveau » et s'arrêter (aller quand même à l'étape 4
  si on a demandé de republier).
- Si `<sha>` est introuvable (réécriture d'historique) : prendre les 30 derniers commits et le signaler.
- Pour un commit douteux, ne lire que la partie utile de la doc à jour (`grep -n '^## ' <fichier>`, puis
  `sed -n 'a,bp'` sur la section) pour vérifier une promesse précise : ne pas ouvrir les guides en entier.

Le sha de `derniere-revue.json` est mis à jour à l'étape 3 (HEAD de `origin/main` de chaque outil revu).

## 2. Trier : uniquement les fonctionnalités importantes

**Garder** ce qu'un utilisateur remarque et qui change ce qu'il peut faire :
- une nouvelle fonction, un nouvel outil, un nouveau mode, un nouvel export ou une nouvelle intégration ;
- une amélioration nette d'une fonction existante (plus rapide, plus simple, nouveau cas couvert) ;
- un gain de confort visible et notable (nouveau raccourci majeur, nouvelle vue, reprise du travail…).

**Écarter** systématiquement :
- documentation, README, captures, tests, CI, Docker interne, refactorisation, dépendances, renommage interne ;
- corrections de bugs mineures, ajustements de mise en page, libellés, couleurs, alignements ;
- retrait d'une fonction ou changement de plateforme sans bénéfice pour l'utilisateur ;
- tout ce qui ne se décrit qu'en termes techniques (noms d'API, de champs, de fichiers, de bibliothèques).

**Regrouper** plusieurs commits qui servent la même fonctionnalité en une seule entrée (dater du plus récent).
Une entrée existante peut être complétée plutôt que doublée si la nouveauté la prolonge le même jour.

## 3. Rédiger dans `content/nouveautes.json`

Ajouter les entrées **en tête** de `entries` (ordre : date décroissante ; à date égale, la plus importante d'abord) :

```json
{
  "date": "AAAA-MM-JJ",
  "tool": "geosillage",
  "title": "Titre court orienté bénéfice (≤ 60 caractères)",
  "text": "Une ou deux phrases : ce que l'utilisateur peut faire maintenant et pourquoi c'est utile (≤ 220 caractères).",
  "link": "guide/#ancre-de-la-section"
}
```

Règles de rédaction :
- **français**, même si le commit est en anglais ; vouvoiement ou tournure impersonnelle ; ton clair et concret ;
- parler de l'usage (« Corrigez… », « Les photos se placent… »), jamais de l'implémentation ;
- pas d'emoji, pas de superlatifs creux (« révolutionnaire », « incroyable ») ;
- `date` = date du commit le plus récent du groupe ; `tool` = id de l'outil (voir le rapport) ;
- `link` : relatif à la page de l'outil. De préférence une ancre du guide (`guide/#…`), calculée comme GitHub à
  partir du titre de section : minuscules, ponctuation retirée, espaces → `-` (ex. « 5. Corriger le retard GPS
  (onglet Synchro) » → `5-corriger-le-retard-gps-onglet-synchro`, « Projet Panoramax : corriger… » →
  `projet-panoramax--corriger…`). Vide (`""`) pour pointer sur la page de l'outil.
  `npm run check` signale toute ancre inexistante.

Puis enregistrer comme revus, dans `content/derniere-revue.json`, le HEAD de `origin/main` de chaque outil
examiné (`git -C .cache/<outil> rev-parse origin/main`) et sa date de commit (`%cs`), dans le même commit que les
nouveautés. Un outil sans nouveauté dans la période revue garde aussi son sha mis à jour.

## 4. Mettre à jour l'accroche si une fonctionnalité majeure est arrivée

Dans `site.config.mjs`, pour l'outil concerné, `pitch` et `promise` (4 points courts) résument ce que fait l'outil.
Les modifier seulement si une nouveauté change ce qu'on doit en retenir (ex. une publication directe sur Panoramax).
Toute affirmation doit être vraie d'après le guide de l'outil. Si un outil a renommé une section de sa doc et que
le build ou une page perd du contenu, adapter les expressions régulières de `site.config.mjs`.

## 5. Construire et vérifier

```sh
npm run build    # doit afficher le nombre de pages et de nouveautés, sans erreur
npm run check    # aucun lien ni ancre cassé
```

Contrôler visuellement l'accueil et `/nouveautes/` (par exemple avec Playwright sur `npm run serve`, en 1280 px et
390 px) : les nouvelles entrées apparaissent avec le badge « Nouveau » et le bon outil.

## 6. Publier

Avec `--dry-run` : montrer les entrées rédigées et s'arrêter là.

Sinon, committer (`content/nouveautes.json`, `content/derniere-revue.json`, et `site.config.mjs` si modifié) avec un message du type
« Nouveautés : <outil> — <titre 1>, <titre 2> », puis pousser sur `main` : le workflow *Site* reconstruit et publie
https://panoramax-tools.my-heb.eu/. Si la session impose une autre branche de travail, y pousser puis la fusionner
dans `main` (en avance rapide) : le propriétaire l'autorise sans confirmation (voir AGENTS.md).

Pour finir, résumer à l'utilisateur : les nouveautés ajoutées (titre + outil), les commits écartés et pourquoi en
une ligne, et l'état de la publication.
