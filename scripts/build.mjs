// Construction du site statique dans dist/.
//
//   node scripts/build.mjs            clone les dépôts des outils dans .cache/ puis génère dist/
//   SOURCES_DIR=.. node scripts/...   utilise des clones locaux (<SOURCES_DIR>/<dépôt>)
//
// Tout le contenu propre aux outils (fonctionnalités, guide, captures, raccourcis, feuille de route)
// est extrait de leur documentation : une fonctionnalité documentée
// apparaît au prochain build. Les nouveautés viennent de content/nouveautes.json (skill /update-site).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../site.config.mjs';
import { fetchSource } from './sources.mjs';
import {
  Doc,
  esc,
  faqFrom,
  featuresFromItems,
  featuresFromSections,
  sectionHtml,
  shortcutsFrom,
  statusFrom,
  stepsFrom,
  slugify,
} from './markdown.mjs';
import { frDate, heroArt, icons, layout, newsItem, newsList, shortcutsTable, toolMark } from './templates.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const cache = path.join(root, '.cache');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const site = { ...config, builtAt: new Date().toISOString() };
site.buildId = Date.now().toString(36);
const write = (rel, content) => {
  const f = path.join(dist, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
};
const pages = [];
const addPage = (rel, html) => {
  write(rel, html);
  pages.push(rel.replace(/index\.html$/, ''));
};

// ---------------------------------------------------------------- sources

const now = Date.now();
for (const tool of site.tools) {
  console.log(`· ${tool.repo}`);
  const src = fetchSource(tool, cache);
  tool.source = src;
  tool.guidePage = `${tool.id}/guide/`;

  const assets = new Map();
  const assetUrl = (repoPath) => {
    if (!src.exists(repoPath)) return null;
    if (!assets.has(repoPath)) {
      const rel = `assets/${tool.id}/${repoPath.replace(/^(docs?|frontend\/public)\//, '').replace(/\//g, '-')}`;
      fs.mkdirSync(path.dirname(path.join(dist, rel)), { recursive: true });
      fs.copyFileSync(src.abs(repoPath), path.join(dist, rel));
      assets.set(repoPath, rel);
    }
    return assets.get(repoPath);
  };
  tool.assetUrl = assetUrl;
  tool.logoUrl = tool.logo ? assetUrl(tool.logo) : null;
  tool.heroUrl = tool.hero ? assetUrl(tool.hero) : null;

  const docPages = new Map([[tool.guide.file, tool.guidePage]]);
  const docs = new Map();
  tool.doc = (file) => {
    if (!docs.has(file)) {
      docs.set(file, new Doc(src.read(file), { tool, file, branch: src.branch, siteUrl: site.siteUrl, assetUrl, docPages }));
    }
    return docs.get(file);
  };

}

// Nouveautés : fichier rédigé (content/nouveautes.json), tenu à jour par le skill /update-site.
// Seules les fonctionnalités utiles à l'utilisateur y figurent, pas les modifications techniques.
const curated = JSON.parse(fs.readFileSync(path.join(root, 'content/nouveautes.json'), 'utf8'));
const toolById = new Map(site.tools.map((t) => [t.id, t]));
const allNews = curated.entries
  .map((e, i) => {
    const tool = toolById.get(e.tool);
    if (!tool) throw new Error(`content/nouveautes.json : outil inconnu « ${e.tool} »`);
    const date = new Date(e.date + 'T12:00:00Z').toISOString();
    return {
      ...e,
      order: i,
      date,
      tool,
      // Lien relatif à la racine du site (page de l'outil ou ancre de son guide).
      href: `${tool.id}/${e.link || ''}`,
      isNew: now - new Date(date).getTime() < site.newDays * 864e5,
    };
  })
  .sort((a, b) => b.date.localeCompare(a.date) || a.order - b.order);
for (const t of site.tools) t.news = allNews.filter((n) => n.tool === t);

// ---------------------------------------------------------------- helpers de contenu

function features(tool, prefix) {
  const f = tool.features;
  const doc = tool.doc(f.file);
  return f.mode === 'sections'
    ? featuresFromSections(doc, f, tool.guidePage)
    : featuresFromItems(doc, f, tool.guidePage);
}

function featureCount(tool) {
  const f = features(tool);
  return tool.features.mode === 'sections'
    ? f.reduce((n, c) => n + Math.max(1, c.points.length), 0)
    : f.reduce((n, g) => n + g.items.length, 0);
}

const btn = (href, label, kind = 'primary', ext = false) =>
  `<a class="btn btn-${kind}" href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${esc(label)}${ext ? icons.external : icons.arrow}</a>`;

const isExt = (href) => /^https?:/.test(href);

// ---------------------------------------------------------------- accueil

{
  const prefix = '';
  const toolCards = site.tools
    .map((t) => {
      const ctaHref = isExt(t.cta.href) ? t.cta.href : `${t.id}/${t.cta.href}`;
      return `<article class="tool-card" style="--c:${t.accent}">
  <div class="tool-card-head">
    <span class="tool-mark">${toolMark(t, prefix)}</span>
    <div><h3><a href="${t.id}/">${esc(t.name)}</a></h3><span class="kind">${esc(t.kind)}</span></div>
  </div>
  ${t.heroUrl ? `<a class="shot" href="${t.id}/"><img src="${t.heroUrl}" alt="Interface de ${esc(t.name)}" loading="lazy"></a>` : ''}
  <p class="lead">${esc(t.pitch)}</p>
  <ul class="checks">${t.promise.map((p) => `<li>${icons.check}${esc(p)}</li>`).join('')}</ul>
  <div class="actions">${btn(`${t.id}/`, 'Découvrir', 'primary')}${btn(ctaHref, t.cta.label, 'ghost', isExt(ctaHref))}</div>
</article>`;
    })
    .join('\n');

  const [gs, fx] = site.tools;
  const chain = [
    { n: 1, title: 'Capturer', text: 'Une photo 360° toutes les deux secondes avec une GoPro MAX, à vélo, à pied ou en voiture.' },
    { n: 2, title: 'Préparer', text: `Avec ${gs.name} : séquences, retard GPS, positions, caps et orientation, export EXIF vérifié.`, href: `${gs.id}/` },
    { n: 3, title: 'Publier', text: 'Envoi direct sur l’instance Panoramax de votre choix, avec les attributs de la séquence.', href: 'https://panoramax.fr', ext: true },
    { n: 4, title: 'Peaufiner', text: `Avec ${fx.name} : horizon et cap des photos déjà en ligne, au rendu exact de Panoramax.`, href: `${fx.id}/` },
  ];

  const stats = [
    ...site.tools.map((t) => ({ value: featureCount(t), label: `fonctions clés documentées dans ${t.name}` })),
    { value: allNews.filter((n) => now - new Date(n.date).getTime() < 30 * 864e5).length, label: 'nouvelles fonctionnalités ces 30 derniers jours' },
    { value: '100 %', label: 'libre, gratuit, sans compte supplémentaire' },
  ];

  const body = `
<section class="hero">
  <div class="wrap hero-grid">
    <div>
      <p class="eyebrow">Photo de terrain 360° · Panoramax</p>
      <h1>${esc(site.tagline)}</h1>
      <p class="lead">Deux outils libres et amateurs qui transforment des milliers de photos brutes en séquences propres, bien placées et bien orientées sur <a href="https://panoramax.fr" target="_blank" rel="noopener">Panoramax</a>, le géocommun de la photo de terrain.</p>
      <div class="actions">${site.tools.map((t, i) => btn(`${t.id}/`, t.name, i ? 'ghost' : 'primary')).join('')}</div>
      <p class="indep">Site amateur et indépendant, non lié à l’organisation Panoramax : des outils bénévoles pour aider les contributeurs.</p>
    </div>
    <div class="hero-visual">${heroArt}</div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <p class="eyebrow">La chaîne complète</p>
    <h2>De la caméra au géocommun, sans perdre une photo</h2>
    <ol class="chain">
      ${chain
        .map(
          (c) => `<li><span class="num">${c.n}</span><h3>${c.href ? `<a href="${c.href}"${c.ext ? ' target="_blank" rel="noopener"' : ''}>${esc(c.title)}</a>` : esc(c.title)}</h3><p>${esc(c.text)}</p></li>`,
        )
        .join('\n      ')}
    </ol>
  </div>
</section>

<section class="wrap section" id="outils">
  <p class="eyebrow">Les outils</p>
  <h2>Choisissez l’outil adapté à votre étape</h2>
  <div class="tool-grid">${toolCards}</div>
</section>

<section class="band band-dark">
  <div class="wrap stats">
    ${stats.map((s) => `<div class="stat"><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></div>`).join('\n    ')}
  </div>
</section>

<section class="wrap section two-col">
  <div>
    <p class="eyebrow">Nouveautés</p>
    <h2>Les outils évoluent chaque semaine</h2>
    <p class="muted">Les nouvelles fonctionnalités, expliquées simplement.</p>
    <p class="actions">${btn('nouveautes/', 'Toutes les nouveautés', 'ghost')}<a class="btn btn-link" href="feed.xml">${icons.rss} S’abonner</a></p>
  </div>
  ${newsList(allNews.slice(0, site.homeNews), site, prefix)}
</section>

<section class="wrap section why">
  <p class="eyebrow">Pourquoi Panoramax</p>
  <h2>Des photos de terrain qui appartiennent à tous</h2>
  <div class="why-grid">
    <div><h3>Un géocommun</h3><p>Panoramax est une alternative libre aux services propriétaires de vues immersives, portée par OpenStreetMap France et l’IGN. Vos photos servent à tous : cartographes, collectivités, randonneurs. Nos outils n’en font pas partie : ce sont des compléments indépendants, faits par un contributeur pour les contributeurs.</p></div>
    <div><h3>Des données fiables</h3><p>Une photo mal placée ou qui penche se réutilise mal. Nos outils corrigent position, cap et horizon avant ou après publication, sans retoucher l’image.</p></div>
    <div><h3>Vos fichiers restent chez vous</h3><p>GeoSillage tourne sur votre machine et ne modifie pas les originaux sans votre accord ; Pan360 FixExif garde tout dans votre navigateur.</p></div>
  </div>
</section>

<section class="cta-band">
  <div class="wrap">
    <h2>Prêt à publier votre prochaine sortie ?</h2>
    <div class="actions">${site.tools.map((t) => btn(isExt(t.cta.href) ? t.cta.href : `${t.id}/${t.cta.href}`, t.cta.label, 'primary', isExt(t.cta.href))).join('')}</div>
  </div>
</section>`;

  addPage(
    'index.html',
    layout({
      site,
      prefix,
      canonical: '',
      active: 'home',
      body,
      page: {
        kind: 'home',
        ogImage: site.tools[0].heroUrl,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: site.tools.map((t, i) => ({
            '@type': 'SoftwareApplication',
            position: i + 1,
            name: t.name,
            description: t.pitch,
            applicationCategory: 'MultimediaApplication',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
            url: `${site.siteUrl}/${t.id}/`,
          })),
        },
      },
    }),
  );
}

// ---------------------------------------------------------------- pages outil

for (const tool of site.tools) {
  const prefix = '../';
  const opts = { prefix, anchorPage: tool.guidePage };
  const guideHref = 'guide/';
  const ctaHref = isExt(tool.cta.href) ? tool.cta.href : tool.cta.href;
  const sections = [];

  // Parcours
  const steps = stepsFrom(tool.doc(tool.workflow.file), tool.workflow.section, opts);
  if (steps.length) {
    sections.push(`<section class="wrap section" id="parcours">
  <p class="eyebrow">Comment ça marche</p>
  <h2>${steps.length} étapes, de bout en bout</h2>
  <ol class="steps">
    ${steps.map((s, i) => `<li><span class="num">${i + 1}</span><div>${s.title ? `<h3>${esc(s.title)}</h3>` : ''}<p>${s.html}</p>${s.sub}</div></li>`).join('\n    ')}
  </ol>
</section>`);
  }

  // Fonctionnalités
  const feats = features(tool, prefix);
  if (tool.features.mode === 'sections') {
    sections.push(`<section class="band"><div class="wrap" id="fonctionnalites">
  <p class="eyebrow">Fonctionnalités</p>
  <h2>Tout ce qu’il faut pour une séquence impeccable</h2>
  <div class="feature-grid">
    ${feats
      .map(
        (f) => `<article class="feature">
      ${f.image ? `<img src="${prefix}${f.image}" alt="${esc(f.imageAlt)}" loading="lazy" data-zoom>` : ''}
      <div class="feature-body">
        <h3>${esc(f.title)}</h3>
        <p>${esc(f.summary)}</p>
        ${f.points.length ? `<ul class="checks small">${f.points.map((p) => `<li>${icons.check}${esc(p)}</li>`).join('')}</ul>` : ''}
        <a class="more" href="${prefix}${f.href}">En savoir plus ${icons.arrow}</a>
      </div>
    </article>`,
      )
      .join('\n    ')}
  </div>
</div></section>`);
  } else {
    sections.push(`<section class="band"><div class="wrap" id="fonctionnalites">
  <p class="eyebrow">Fonctionnalités</p>
  <h2>Des outils précis, pensés pour aller vite</h2>
  ${feats
    .map(
      (g) => `<h3 class="group-title"><a href="${prefix}${g.href}">${esc(g.title)}</a></h3>
  <div class="item-grid">
    ${g.items.map((it) => `<article class="item"><h4>${esc(it.title)}${it.key ? ` <kbd>${esc(it.key)}</kbd>` : ''}</h4><p>${esc(it.text)}</p></article>`).join('\n    ')}
  </div>`,
    )
    .join('\n  ')}
</div></section>`);
  }

  // Galerie
  const gallery = tool.doc(tool.gallery.file).images();
  if (gallery.length > 1) {
    sections.push(`<section class="wrap section" id="captures">
  <p class="eyebrow">En images</p>
  <h2>Aperçu de l’interface</h2>
  <div class="gallery">
    ${gallery.map((g) => `<figure><img src="${prefix}${g.src}" alt="${esc(g.alt)}" loading="lazy" data-zoom><figcaption>${esc(g.caption)}</figcaption></figure>`).join('\n    ')}
  </div>
</section>`);
  }

  // Feuille de route
  if (tool.status) {
    const st = statusFrom(tool.doc(tool.status.file), tool.status.section, opts);
    if (st) {
      sections.push(`<section class="band"><div class="wrap two-col" id="feuille-de-route">
  <div>
    <p class="eyebrow">Feuille de route</p>
    <h2>Déjà disponible</h2>
    <ul class="roadmap done">${st.done.map((s) => `<li>${icons.check}<div><span class="phase">${esc(s.phase)}</span> ${s.html}</div></li>`).join('')}</ul>
  </div>
  <div>
    <h2 class="spacer">Prochainement</h2>
    <ul class="roadmap next">${st.next.map((s) => `<li><span class="dot"></span><div><span class="phase">${esc(s.phase)} · ${esc(s.state)}</span> ${s.html}</div></li>`).join('') || '<li>Tout est livré !</li>'}</ul>
  </div>
</div></section>`);
    }
  }

  // Raccourcis
  const sc = shortcutsFrom(tool.doc(tool.shortcuts.file), tool.shortcuts.section);
  if (sc.length) {
    sections.push(`<section class="wrap section" id="raccourcis">
  <p class="eyebrow">Au clavier</p>
  <h2>${sc.length} raccourcis pour enchaîner sans la souris</h2>
  ${shortcutsTable(sc)}
</section>`);
  }

  // Installation, bon à savoir, FAQ
  const install = sectionHtml(tool.doc(tool.install.file), tool.install.section, opts);
  const notes = tool.notes && sectionHtml(tool.doc(tool.notes.file), tool.notes.section, opts);
  const faq = tool.faq ? faqFrom(tool.doc(tool.faq.file), tool.faq.section, opts) : [];
  sections.push(`<section class="band"><div class="wrap two-col" id="demarrer">
  <div class="prose">
    <p class="eyebrow">${tool.live ? 'Démarrer' : 'Installation'}</p>
    ${tool.live ? `<h2>Rien à installer</h2><p>L’application fonctionne directement dans votre navigateur.</p><p>${btn(tool.live, 'Ouvrir ' + tool.name, 'primary', true)}</p><h3>${esc(install?.title || 'Lancer en local')}</h3>` : `<h2>${esc(install?.title.replace(/^\d+\.\s*/, '') || 'Installer')}</h2>`}
    ${install?.html.replace(/<h3 /g, '<h4 ').replace(/<\/h3>/g, '</h4>') || ''}
  </div>
  <div class="prose">
    ${
      faq.length
        ? `<p class="eyebrow">Questions fréquentes</p><h2>Vos questions</h2>${faq.map((f) => `<details><summary>${esc(f.q)}</summary><div>${f.a}</div></details>`).join('')}`
        : notes
          ? `<p class="eyebrow">Bon à savoir</p><h2>${esc(notes.title)}</h2>${notes.html}`
          : ''
    }
  </div>
</div></section>`);

  // Nouveautés de l'outil
  sections.push(`<section class="wrap section two-col" id="nouveautes">
  <div>
    <p class="eyebrow">Nouveautés</p>
    <h2>Nouveautés de ${esc(tool.name)}</h2>
    <p class="actions">${btn(`${prefix}nouveautes/#${tool.id}`, 'Tout l’historique', 'ghost')}</p>
  </div>
  ${newsList(tool.news.slice(0, 10), site, prefix, { showTool: false })}
</section>`);

  const body = `
<section class="hero hero-tool" style="--c:${tool.accent}">
  <div class="wrap hero-grid">
    <div>
      <p class="eyebrow"><span class="tool-mark sm">${toolMark(tool, prefix)}</span>${esc(tool.kind)}</p>
      <h1>${esc(tool.name)}</h1>
      <p class="lead">${esc(tool.pitch)}</p>
      <ul class="checks">${tool.promise.map((p) => `<li>${icons.check}${esc(p)}</li>`).join('')}</ul>
      <p class="muted">${esc(tool.audience)}</p>
      <div class="actions">
        ${btn(ctaHref, tool.cta.label, 'primary', isExt(ctaHref))}
        ${btn(guideHref, 'Lire le guide', 'ghost')}
        <a class="btn btn-link" href="https://github.com/${tool.repo}" target="_blank" rel="noopener">${icons.github} Code source</a>
      </div>
    </div>
    ${tool.heroUrl ? `<div class="hero-shot"><img src="${prefix}${tool.heroUrl}" alt="Interface de ${esc(tool.name)}" data-zoom></div>` : ''}
  </div>
  <nav class="wrap subnav" aria-label="Sur cette page">
    ${[
      ['parcours', 'Comment ça marche', steps.length],
      ['fonctionnalites', 'Fonctionnalités', 1],
      ['captures', 'Captures', gallery.length > 1],
      ['feuille-de-route', 'Feuille de route', tool.status],
      ['raccourcis', 'Raccourcis', sc.length],
      ['demarrer', tool.live ? 'Démarrer' : 'Installation', 1],
      ['nouveautes', 'Nouveautés', 1],
    ]
      .filter((x) => x[2])
      .map(([id, l]) => `<a href="#${id}">${esc(l)}</a>`)
      .join('')}
    <a href="guide/">Guide complet →</a>
  </nav>
</section>
${sections.join('\n')}
<section class="cta-band" style="--c:${tool.accent}">
  <div class="wrap">
    <h2>${esc(tool.pitch)}</h2>
    <div class="actions">${btn(ctaHref, tool.cta.label, 'primary', isExt(ctaHref))}${btn(guideHref, 'Lire le guide', 'ghost')}</div>
  </div>
</section>`;

  addPage(
    `${tool.id}/index.html`,
    layout({
      site,
      prefix,
      canonical: `${tool.id}/`,
      active: tool.id,
      title: tool.name,
      description: `${tool.name} : ${tool.pitch}`,
      body,
      page: {
        kind: 'tool',
        ogImage: tool.heroUrl,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: tool.name,
          description: tool.pitch,
          applicationCategory: 'MultimediaApplication',
          operatingSystem: tool.live ? 'Navigateur web' : 'Linux, macOS, Windows (Docker)',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
          url: `${site.siteUrl}/${tool.id}/`,
          codeRepository: `https://github.com/${tool.repo}`,
          dateModified: tool.source.date,
        },
      },
    }),
  );

  // ------------------------------------------------------------ guide complet
  {
    const gprefix = '../../';
    const doc = tool.doc(tool.guide.file);
    let tokens = doc.tokens;
    if (tool.guide.dropTitle) tokens = tokens.filter((t) => !(t.type === 'heading' && t.depth === 1));
    if (tool.guide.exclude) {
      const out = [];
      let skip = false;
      for (const t of tokens) {
        if (t.type === 'heading' && t.depth <= 2) skip = tool.guide.exclude.some((re) => re.test(t.text));
        if (!skip) out.push(t);
      }
      tokens = out;
    }
    // Le sommaire en tête du guide fait doublon avec la colonne de navigation.
    tokens = tokens.filter((t) => !(t.type === 'paragraph' && /^Sommaire\s*:/.test(t.text)));
    const toc = tokens
      .filter((t) => t.type === 'heading' && (t.depth === 2 || t.depth === 3))
      .map((t) => ({ depth: t.depth, id: slugify(t.text), text: t.text.replace(/[*`]/g, '') }));
    const html = doc.render(tokens, { prefix: gprefix });
    const body = `
<div class="wrap guide">
  <aside class="toc">
    <a class="toc-back" href="../">← ${esc(tool.name)}</a>
    <p class="toc-title">Sommaire</p>
    <nav>${toc.map((t) => `<a class="d${t.depth}" href="#${esc(t.id)}">${esc(t.text)}</a>`).join('')}</nav>
  </aside>
  <article class="prose guide-body">
    <p class="eyebrow">${esc(tool.name)} · documentation</p>
    <h1>${esc(tool.guide.title)}</h1>
    <p class="doc-meta">Généré depuis <a href="https://github.com/${tool.repo}/blob/${tool.source.branch}/${tool.guide.file}" target="_blank" rel="noopener"><code>${esc(tool.guide.file)}</code></a> · mis à jour le ${esc(frDate(tool.source.date, true))}</p>
    ${html}
  </article>
</div>`;
    addPage(
      `${tool.guidePage}index.html`,
      layout({
        site,
        prefix: gprefix,
        canonical: tool.guidePage,
        active: tool.id,
        title: `${tool.guide.title} – ${tool.name}`,
        description: `Guide d'utilisation complet de ${tool.name} : ${tool.pitch}`,
        body,
        page: { kind: 'guide', ogImage: tool.heroUrl },
      }),
    );
  }
}

// ---------------------------------------------------------------- nouveautés

{
  const prefix = '../';
  const byMonth = (list) => {
    const groups = new Map();
    for (const n of list) {
      const k = n.date.slice(0, 7);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(n);
    }
    return [...groups];
  };
  const monthName = (k) => frDate(k + '-15T00:00:00Z', true).replace(/^\d+ /, '');
  const body = `
<section class="hero hero-small"><div class="wrap">
  <p class="eyebrow">Journal des fonctionnalités</p>
  <h1>Nouveautés</h1>
  <p class="lead">Les nouvelles fonctionnalités de nos outils, expliquées simplement. <a href="${prefix}feed.xml">${icons.rss} Flux Atom</a></p>
  <div class="filters" role="group" aria-label="Filtrer par outil">
    <button type="button" class="chip" aria-pressed="true" data-filter="">Tous</button>
    ${site.tools.map((t) => `<button type="button" class="chip" aria-pressed="false" data-filter="${t.id}" id="${t.id}" style="--c:${t.accent}">${esc(t.name)}</button>`).join('')}
  </div>
</div></section>
<section class="wrap section news-page">
  ${byMonth(allNews)
    .map(
      ([k, list]) => `<h2 class="month">${esc(monthName(k))}</h2>
  <ol class="news">${list
    .map(
      (e) => newsItem(e, prefix, { dataTool: true }),
    )
    .join('')}</ol>`,
    )
    .join('\n  ')}
</section>`;
  addPage(
    'nouveautes/index.html',
    layout({ site, prefix, canonical: 'nouveautes/', active: 'news', title: 'Nouveautés', description: `Les dernières améliorations de ${site.tools.map((t) => t.name).join(' et ')}.`, body, page: { kind: 'news' } }),
  );
}

// ---------------------------------------------------------------- 404, flux, plan du site, versions

write(
  '404.html',
  layout({
    site,
    prefix: '/' + new URL(site.siteUrl).pathname.replace(/^\/|\/$/g, '') + (new URL(site.siteUrl).pathname.length > 1 ? '/' : ''),
    canonical: '404.html',
    title: 'Page introuvable',
    body: `<section class="hero hero-small"><div class="wrap"><h1>Page introuvable</h1><p class="lead">Cette page n’existe pas ou a été déplacée.</p><p class="actions">${btn(site.siteUrl + '/', 'Retour à l’accueil')}</p></div></section>`,
    page: { kind: '404' },
  }),
);

const xml = (s) => esc(s);
write(
  'feed.xml',
  `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="fr">
  <title>${xml(site.title)} – Nouveautés</title>
  <subtitle>${xml(site.description)}</subtitle>
  <link href="${xml(site.siteUrl)}/feed.xml" rel="self"/>
  <link href="${xml(site.siteUrl)}/nouveautes/"/>
  <id>${xml(site.siteUrl)}/</id>
  <updated>${allNews[0]?.date || site.builtAt}</updated>
${allNews
  .slice(0, 50)
  .map(
    (e) => `  <entry>
    <title>${xml(`${e.tool.name} : ${e.title}`)}</title>
    <link href="${xml(`${site.siteUrl}/${e.href}`)}"/>
    <id>${xml(`${site.siteUrl}/nouveautes/#${e.tool.id}-${e.date.slice(0, 10)}-${slugify(e.title)}`)}</id>
    <updated>${e.date}</updated>
    <author><name>${xml(e.tool.name)}</name></author>
    <category term="${xml(e.tool.id)}"/>
    <summary>${xml(e.text)}</summary>
  </entry>`,
  )
  .join('\n')}
</feed>
`,
);

write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${xml(site.siteUrl + '/' + p)}</loc><lastmod>${site.builtAt.slice(0, 10)}</lastmod></url>`).join('\n')}
</urlset>
`,
);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.siteUrl}/sitemap.xml\n`);
write(
  'versions.json',
  JSON.stringify({ builtAt: site.builtAt, site: process.env.GITHUB_SHA || null, tools: Object.fromEntries(site.tools.map((t) => [t.repo, t.source.sha])) }, null, 2) + '\n',
);
write('.nojekyll', '');
write('CNAME', new URL(site.siteUrl).hostname + '\n');

// Fichiers statiques
for (const f of fs.readdirSync(path.join(root, 'src/assets'))) {
  fs.copyFileSync(path.join(root, 'src/assets', f), path.join(dist, 'assets', f));
}

console.log(`✓ ${pages.length} pages, ${allNews.length} nouveautés → dist/`);
for (const t of site.tools) console.log(`  ${t.name} @ ${t.source.sha.slice(0, 7)} (${featureCount(t)} fonctionnalités, ${t.news.length} nouveautés)`);
