// Configuration du site : outils présentés, sources de la documentation et textes éditoriaux.
//
// Tout ce qui décrit le fonctionnement des outils (fonctionnalités, captures, raccourcis, guide,
// nouveautés) est lu à chaque construction dans les dépôts des outils : ce fichier ne contient que
// l'accroche marketing et la façon d'extraire le contenu.

export default {
  title: 'Outils Panoramax',
  tagline: 'Préparez, corrigez et publiez vos photos 360° sur Panoramax',
  description:
    "GeoSillage et Pan360 FixExif : deux outils libres pour préparer des relevés photo 360° (GoPro MAX), " +
    'corriger positions, caps et horizon, et publier sur Panoramax, le géocommun de la photo de terrain.',
  // URL publique du site (sans / final). En CI, remplacée par celle donnée par GitHub Pages.
  siteUrl: (process.env.SITE_URL || 'https://panoramax-tools.my-heb.eu').replace(/\/$/, ''),
  repo: 'https://github.com/qhess34/panoramax-tools',

  // Nombre de nouveautés sur l'accueil, et durée (jours) pendant laquelle une nouveauté porte le badge « Nouveau ».
  homeNews: 8,
  newDays: 21,

  // Messages de commit qui ne sont pas des nouveautés pour l'utilisateur.
  ignoreCommits: [
    /^merge\b/i,
    /^(docs?|documentation|readme)\b/i,
    /^update readme/i,
    /^tests?\b/i,
    /^test de\b/i,
    /^(ci|chore|refactor|style)\b/i,
    /^create cname/i,
    /^(initial commit|init)$/i,
    /^(fix some issues|add view)$/i,
  ],

  tools: [
    {
      id: 'geosillage',
      name: 'GeoSillage',
      repo: 'qhess34/geosillage',
      logo: 'frontend/public/logo.svg',
      accent: '#0ea5e9',
      kind: 'Application locale (Docker)',
      pitch: 'Préparez une sortie de milliers de photos 360° en quelques minutes, du dossier GoPro à la séquence Panoramax.',
      promise: [
        'Découpage en séquences au clavier, arrêts et doublons repérés',
        'Retard GPS corrigé en glissant une photo sur la vue satellite',
        'Recalage sur les voies OpenStreetMap, caps et orientation maîtrisés',
        'Export EXIF vérifié et publication Panoramax en un clic',
      ],
      audience: 'Contributeurs Panoramax équipés d’une GoPro MAX : vélo, rando, voiture.',
      hero: 'doc/images/02-ecran.webp',
      cta: { label: 'Installer GeoSillage', href: 'guide/#1-installer-et-lancer' },
      guide: {
        file: 'doc/GUIDE_UTILISATEUR.md',
        title: "Guide d'utilisation",
        // Le titre H1 du fichier est remplacé par celui de la page.
        dropTitle: true,
      },
      features: {
        // Une carte par grande section du guide ; les sous-sections deviennent des points clés.
        mode: 'sections',
        file: 'doc/GUIDE_UTILISATEUR.md',
        exclude: [/installer/i, /raccourcis/i, /questions/i],
      },
      // Parcours : liste numérotée de la section « Préparer une sortie en bref » du README.
      workflow: { file: 'README.md', section: /en bref/i },
      install: { file: 'doc/GUIDE_UTILISATEUR.md', section: /installer/i },
      shortcuts: { file: 'doc/GUIDE_UTILISATEUR.md', section: /raccourcis/i },
      faq: { file: 'doc/GUIDE_UTILISATEUR.md', section: /questions/i },
      status: { file: 'README.md', section: /avancement/i },
      gallery: { file: 'doc/GUIDE_UTILISATEUR.md' },
    },
    {
      id: 'pan360-fixexif',
      name: 'Pan360 FixExif',
      repo: 'qhess34/pan360-fixexif',
      accent: '#f97316',
      kind: 'Application web, sans installation',
      live: 'https://panofix.my-heb.eu/',
      pitch: 'Redressez l’horizon et le cap de vos photos 360° déjà publiées, en voyant exactement ce que Panoramax affichera.',
      promise: [
        'Rendu identique au viewer officiel Panoramax (WYSIWYG)',
        'Horizon redressé par points, par verticales ou d’un clic',
        'Report automatique d’une correction sur toute la séquence',
        'Rien à installer : tout reste dans votre navigateur',
      ],
      audience: 'Contributeurs dont les photos publiées penchent ou s’ouvrent dans la mauvaise direction.',
      hero: 'doc/view.png',
      cta: { label: 'Ouvrir l’application', href: 'https://panofix.my-heb.eu/' },
      guide: { file: 'README.md', title: "Guide d'utilisation", dropTitle: true, exclude: [/contribuer/i, /mise en ligne/i] },
      features: {
        // Lignes de tableaux et puces en gras de la section « L'interface ».
        mode: 'items',
        file: 'README.md',
        section: /interface/i,
      },
      workflow: { file: 'README.md', section: /démarrage rapide/i },
      install: { file: 'README.md', section: /lancer en local/i },
      shortcuts: { file: 'README.md', section: /raccourcis/i },
      notes: { file: 'README.md', section: /bon à savoir/i },
      gallery: { file: 'README.md' },
    },
  ],
};
