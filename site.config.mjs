// Configuration du site : outils présentés, sources de la documentation et textes éditoriaux.
//
// Tout ce qui décrit le fonctionnement des outils (fonctionnalités, captures, raccourcis, guide,
// nouveautés) est lu à chaque construction dans les dépôts des outils : ce fichier ne contient que
// l'accroche marketing et la façon d'extraire le contenu.

export default {
  title: 'Outils Panoramax',
  tagline: 'Préparez, corrigez et publiez vos photos 360° sur Panoramax',
  description:
    "GeoSillage et Pan360 FixExif : deux outils libres et amateurs pour préparer vos photos 360° (GoPro MAX), " +
    'corriger leurs positions, leurs caps et leur horizon, puis les publier sur Panoramax. Site indépendant, non lié à l’organisation Panoramax.',
  // Version anglaise (les textes ci-dessus sont le français, langue par défaut).
  en: {
    title: 'Panoramax Tools',
    tagline: 'Prepare, fix and publish your 360° photos on Panoramax',
    description:
      'GeoSillage and Pan360 FixExif: two free, amateur tools to prepare your 360° photos (GoPro MAX), ' +
      'fix their positions, headings and horizon, then publish them on Panoramax. Independent site, not affiliated with the Panoramax organisation.',
  },
  // URL publique du site (sans / final). En CI, remplacée par celle donnée par GitHub Pages.
  siteUrl: (process.env.SITE_URL || 'https://panoramax-tools.my-heb.eu').replace(/\/$/, ''),
  repo: 'https://github.com/qhess34/panoramax-tools',

  // Nouveautés : voir content/nouveautes.json (rédigé, mis à jour par le skill /update-site).
  // Nombre de nouveautés sur l'accueil, et durée (jours) pendant laquelle une nouveauté porte le badge « Nouveau ».
  homeNews: 8,
  newDays: 21,

  tools: [
    {
      id: 'geosillage',
      name: 'GeoSillage',
      repo: 'qhess34/geosillage',
      logo: 'frontend/public/logo.svg',
      accent: '#0ea5e9',
      kind: 'Application locale (Docker)',
      pitch: 'Transformez le dossier d’une sortie GoPro en séquences prêtes à publier sur Panoramax : découpage, positions, caps et export.',
      promise: [
        'Découpage en séquences au clavier, arrêts et doublons signalés',
        'Retard du GPS corrigé sur la vue satellite ou avec votre trace GPX',
        'Photos recalées sur les voies OpenStreetMap, caps et orientation réglables',
        'Export EXIF relu fichier par fichier, publication directe sur Panoramax',
      ],
      audience: 'Pour les contributeurs Panoramax qui photographient avec une GoPro MAX, à vélo, à pied ou en voiture.',
      hero: 'doc/images/02-ecran.webp',
      // Licence de l'outil : le fichier doit exister dans son dépôt (sinon le build échoue).
      license: { id: 'EUPL-1.2', file: 'LICENSE' },
      cta: { label: 'Installer GeoSillage', href: 'guide/#1-installer-et-lancer' },
      // Textes anglais ; la documentation détaillée reste en français tant que l'outil n'a pas de guide anglais.
      en: {
        kind: 'Local app (Docker)',
        pitch: 'Turn a GoPro ride folder into sequences ready to publish on Panoramax: splitting, positions, headings and export.',
        promise: [
          'Keyboard-driven splitting into sequences, with stops and duplicates flagged',
          'GPS delay fixed on the satellite view or with your GPX track',
          'Photos snapped to OpenStreetMap ways, adjustable heading and orientation',
          'EXIF export checked file by file, direct publishing to Panoramax',
        ],
        audience: 'For Panoramax contributors who shoot with a GoPro MAX, by bike, on foot or by car.',
        cta: { label: 'Install GeoSillage' },
        // Guide anglais de l'outil (mêmes sections que le guide français) : les pages anglaises l'utilisent à la place du français.
        hero: 'doc/images/en/02-ecran.webp',
        guide: { file: 'doc/USER_GUIDE.md', title: 'User guide', dropTitle: true, dropIntro: [/^Contents\s*:/, /^🇫🇷/] },
        features: { mode: 'sections', file: 'doc/USER_GUIDE.md', exclude: [/install/i, /shortcuts/i, /faq/i] },
        workflow: { file: 'README.en.md', section: /in brief/i },
        install: { file: 'doc/USER_GUIDE.md', section: /install/i },
        shortcuts: { file: 'doc/USER_GUIDE.md', section: /shortcuts/i },
        faq: { file: 'doc/USER_GUIDE.md', section: /faq/i },
        gallery: { file: 'doc/USER_GUIDE.md' },
      },
      guide: {
        file: 'doc/GUIDE_UTILISATEUR.md',
        title: "Guide d'utilisation",
        // Le titre H1 du fichier est remplacé par celui de la page.
        dropTitle: true,
        dropIntro: [/^Sommaire\s*:/],
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
      gallery: { file: 'doc/GUIDE_UTILISATEUR.md' },
    },
    {
      id: 'pan360-fixexif',
      name: 'Pan360 FixExif',
      repo: 'qhess34/pan360-fixexif',
      accent: '#f97316',
      kind: 'Application web, sans installation',
      live: 'https://panofix.my-heb.eu/',
      pitch: 'Redressez l’horizon et le cap de vos photos 360° déjà publiées, avec un affichage identique à celui de Panoramax.',
      promise: [
        'Photo affichée comme sur Panoramax : vous voyez le résultat avant d’enregistrer',
        'Horizon redressé à partir de points ou de verticales cliqués',
        'Correction reportée automatiquement sur les photos suivantes',
        'Rien à installer, tout reste dans votre navigateur',
      ],
      audience: 'Pour les contributeurs dont les photos publiées penchent ou s’ouvrent dans la mauvaise direction.',
      hero: 'doc/view.png',
      cta: { label: 'Ouvrir l’application', href: 'https://panofix.my-heb.eu/' },
      en: {
        kind: 'Web app, nothing to install',
        pitch: 'Straighten the horizon and heading of your already published 360° photos, with a display identical to Panoramax.',
        promise: [
          'Photo displayed as on Panoramax: you see the result before saving',
          'Horizon straightened from clicked points or verticals',
          'Correction carried over automatically to the following photos',
          'Nothing to install, everything stays in your browser',
        ],
        audience: 'For contributors whose published photos tilt or open in the wrong direction.',
        cta: { label: 'Open the app' },
      },
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
