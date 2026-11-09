// Construction du site statique dans dist/.
//
//   node scripts/build.mjs            clone les dépôts des outils dans .cache/ puis génère dist/
//   SOURCES_DIR=.. node scripts/...   utilise des clones locaux (<SOURCES_DIR>/<dépôt>)
//
// Tout le contenu propre aux outils (fonctionnalités, guide, captures, raccourcis)
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
  stepsFrom,
  slugify,
} from './markdown.mjs';
import { frDate, heroArt, icons, layout, newsItem, newsList, shortcutsTable, toolMark } from './templates.mjs';
import { locales, monthName, ui } from './i18n.mjs';

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
  tool.heroUrlEn = tool.en?.hero ? assetUrl(tool.en.hero) : null;

  const docPages = new Map([[tool.guide.file, tool.guidePage]]);
  if (tool.en?.guide) docPages.set(tool.en.guide.file, tool.guidePage);
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
// Chaque entrée porte sa traduction anglaise dans `en: { title, text }`.
const curated = JSON.parse(fs.readFileSync(path.join(root, 'content/nouveautes.json'), 'utf8'));
const toolIds = new Set(site.tools.map((t) => t.id));
for (const e of curated.entries) {
  if (!toolIds.has(e.tool)) throw new Error(`content/nouveautes.json : outil inconnu « ${e.tool} »`);
}

const btn = (href, label, kind = 'primary', ext = false) =>
  `<a class="btn btn-${kind}" href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${esc(label)}${ext ? icons.external : icons.arrow}</a>`;
const isExt = (href) => /^https?:/.test(href);

// Ligne de licence de l'outil (discrète) ; le fichier de licence doit exister dans son dépôt.
function licenseLine(tool, U) {
  if (!tool.license) return '';
  if (!tool.source.exists(tool.license.file)) throw new Error(`${tool.name} : fichier de licence ${tool.license.file} introuvable`);
  const href = `https://github.com/${tool.repo}/blob/${tool.source.branch}/${tool.license.file}`;
  return `<p class="muted license">${U.license} <a href="${href}" target="_blank" rel="noopener">${tool.license.id}</a></p>`;
}

function buildLocale(L, baseSite) {
  const U = ui[L.code];
  const fr = L.code === 'fr';
  const rootOf = (prefix) => prefix + (L.dir ? '../' : ''); // chemin relatif vers la racine du site (ressources, guides)

  // Textes de l'outil dans la langue de la page.
  // `guideHere` : le guide existe dans la langue de la page (sinon on renvoie vers le guide français).
  const tools = baseSite.tools.map((t) => ({
    ...t,
    ...(fr ? {} : t[L.code]),
    cta: { ...t.cta, ...(fr ? {} : t[L.code]?.cta) },
    heroUrl: (!fr && t.heroUrlEn) || t.heroUrl,
    guideHere: fr || !!t[L.code]?.guide,
  }));
  const site = { ...baseSite, ...(fr ? {} : baseSite[L.code]), tools };
  const toolById = new Map(tools.map((t) => [t.id, t]));

  const addPage = (rel, html) => {
    write(L.dir + rel, html);
    pages.push(L.dir + rel.replace(/index\.html$/, ''));
  };

  const allNews = curated.entries
    .map((e, i) => {
      const tool = toolById.get(e.tool);
      const loc = fr ? e : e.en;
      const date = new Date(e.date + 'T12:00:00Z').toISOString();
      return {
        ...e,
        title: loc.title,
        text: loc.text,
        order: i,
        date,
        tool,
        // Lien relatif à la racine de la langue (page de l'outil ou ancre de son guide ; l'ancre anglaise est dans `en.link`).
        href: `${tool.id}/${(!fr && e.en.link) || e.link || ''}`,
        isNew: now - new Date(date).getTime() < site.newDays * 864e5,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.order - b.order);
  for (const t of tools) t.news = allNews.filter((n) => n.tool === t);

  // ---------------------------------------------------------------- helpers de contenu

  function features(tool) {
    const f = tool.features;
    const doc = tool.doc(f.file);
    return f.mode === 'sections' ? featuresFromSections(doc, f, tool.guidePage) : featuresFromItems(doc, f, tool.guidePage);
  }

  function featureCount(tool) {
    const f = features(tool);
    return tool.features.mode === 'sections' ? f.reduce((n, c) => n + Math.max(1, c.points.length), 0) : f.reduce((n, g) => n + g.items.length, 0);
  }

  // Lien d'appel à l'action : ancre du guide (français) ou adresse externe.
  const ctaOf = (t, from) => (isExt(t.cta.href) ? t.cta.href : fr ? `${from}${t.id}/${t.cta.href}` : `${rootOf(from)}${t.id}/${t.cta.href}`);

  // ---------------------------------------------------------------- accueil
  {
    const prefix = '';
    const rp = rootOf(prefix);
    const toolCards = site.tools
      .map((t) => {
        const ctaHref = ctaOf(t, prefix);
        return `<article class="tool-card" style="--c:${t.accent}">
  <div class="tool-card-head">
    <span class="tool-mark">${toolMark(t, rp)}</span>
    <div><h3><a href="${t.id}/">${esc(t.name)}</a></h3><span class="kind">${esc(t.kind)}</span></div>
  </div>
  ${t.heroUrl ? `<a class="shot" href="${t.id}/"><img src="${rp}${t.heroUrl}" alt="${esc(U.interfaceOf(t.name))}" loading="lazy"></a>` : ''}
  <p class="lead">${esc(t.pitch)}</p>
  <ul class="checks">${t.promise.map((p) => `<li>${icons.check}${esc(p)}</li>`).join('')}</ul>
  <div class="actions">${btn(`${t.id}/`, U.discover, 'primary')}${btn(ctaHref, t.cta.label, 'ghost', isExt(ctaHref))}</div>
</article>`;
      })
      .join('\n');

    const [gs, fx] = site.tools;
    const hrefs = [null, `${gs.id}/`, 'https://panoramax.fr', `${fx.id}/`];
    const chain = U.chain(gs.name, fx.name).map((c, i) => ({ ...c, n: i + 1, href: hrefs[i], ext: i === 2 }));

    const stats = [
      ...site.tools.map((t) => ({ value: featureCount(t), label: U.statFeatures(t.name) })),
      { value: allNews.filter((n) => now - new Date(n.date).getTime() < 30 * 864e5).length, label: U.statNews },
      { value: '100 %', label: U.statFree },
    ];

    const body = `
<section class="hero">
  <div class="wrap hero-grid">
    <div>
      <p class="eyebrow">${esc(U.homeEyebrow)}</p>
      <h1>${esc(site.tagline)}</h1>
      <p class="lead">${U.homeLead}</p>
      <div class="actions">${site.tools.map((t, i) => btn(`${t.id}/`, t.name, i ? 'ghost' : 'primary')).join('')}</div>
      <p class="indep">${esc(U.indep)}</p>
    </div>
    <div class="hero-visual">${heroArt(U.heroArtLabel, U.heroArt)}</div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <p class="eyebrow">${esc(U.chainEyebrow)}</p>
    <h2>${esc(U.chainTitle)}</h2>
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
  <p class="eyebrow">${esc(U.toolsEyebrow)}</p>
  <h2>${esc(U.toolsTitle)}</h2>
  <div class="tool-grid">${toolCards}</div>
</section>

<section class="band band-dark">
  <div class="wrap stats">
    ${stats.map((s) => `<div class="stat"><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></div>`).join('\n    ')}
  </div>
</section>

<section class="wrap section two-col">
  <div>
    <p class="eyebrow">${esc(U.newsEyebrow)}</p>
    <h2>${esc(U.homeNewsTitle)}</h2>
    <p class="muted">${esc(U.homeNewsLead)}</p>
    <p class="actions">${btn('nouveautes/', U.allNews, 'ghost')}<a class="btn btn-link" href="feed.xml">${icons.rss} ${esc(U.subscribe)}</a></p>
  </div>
  ${newsList(allNews.slice(0, site.homeNews), site, prefix, { L, rp })}
</section>

<section class="wrap section why">
  <p class="eyebrow">${esc(U.whyEyebrow)}</p>
  <h2>${esc(U.whyTitle)}</h2>
  <div class="why-grid">
    ${U.why.map(([h, p]) => `<div><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('\n    ')}
  </div>
</section>

<section class="cta-band">
  <div class="wrap">
    <h2>${esc(U.homeCta)}</h2>
    <div class="actions">${site.tools.map((t) => btn(ctaOf(t, prefix), t.cta.label, 'primary', isExt(t.cta.href))).join('')}</div>
  </div>
</section>`;

    addPage(
      'index.html',
      layout({
        site,
        L,
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
              inLanguage: L.htmlLang,
              applicationCategory: 'MultimediaApplication',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
              url: `${site.siteUrl}/${L.dir}${t.id}/`,
            })),
          },
        },
      }),
    );
  }

  // ---------------------------------------------------------------- pages outil

  for (const tool of site.tools) {
    const prefix = '../';
    const rp = rootOf(prefix);
    const opts = { prefix, assetPrefix: rp, anchorPage: tool.guidePage };
    const hasDocs = tool.guideHere;
    const guideHref = hasDocs ? 'guide/' : `${rp}${tool.id}/guide/`; // sans guide dans la langue, on renvoie vers le guide français
    const sections = [];
    let steps = [];
    let gallery = [];
    let sc = [];

    if (hasDocs) {
      // Parcours
      steps = tool.workflow ? stepsFrom(tool.doc(tool.workflow.file), tool.workflow.section, opts) : [];
      if (steps.length) {
        sections.push(`<section class="wrap section" id="parcours">
  <p class="eyebrow">${esc(U.howEyebrow)}</p>
  <h2>${esc(U.howTitle(steps.length))}</h2>
  <ol class="steps">
    ${steps.map((s, i) => `<li><span class="num">${i + 1}</span><div>${s.title ? `<h3>${esc(s.title)}</h3>` : ''}<p>${s.html}</p>${s.sub}</div></li>`).join('\n    ')}
  </ol>
</section>`);
      }

      // Fonctionnalités
      const feats = features(tool);
      if (tool.features.mode === 'sections') {
        sections.push(`<section class="band"><div class="wrap" id="fonctionnalites">
  <p class="eyebrow">${esc(U.featEyebrow)}</p>
  <h2>${esc(U.featSectionsTitle)}</h2>
  <div class="feature-grid">
    ${feats
      .map(
        (f) => `<article class="feature">
      ${f.image ? `<img src="${rp}${f.image}" alt="${esc(f.imageAlt)}" loading="lazy" data-zoom>` : ''}
      <div class="feature-body">
        <h3>${esc(f.title)}</h3>
        <p>${esc(f.summary)}</p>
        ${f.points.length ? `<ul class="checks small">${f.points.map((p) => `<li>${icons.check}${esc(p)}</li>`).join('')}</ul>` : ''}
        <a class="more" href="${prefix}${f.href}">${esc(U.more)} ${icons.arrow}</a>
      </div>
    </article>`,
      )
      .join('\n    ')}
  </div>
</div></section>`);
      } else {
        sections.push(`<section class="band"><div class="wrap" id="fonctionnalites">
  <p class="eyebrow">${esc(U.featEyebrow)}</p>
  <h2>${esc(U.featItemsTitle)}</h2>
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
      gallery = tool.doc(tool.gallery.file).images();
      if (gallery.length > 1) {
        sections.push(`<section class="wrap section" id="captures">
  <p class="eyebrow">${esc(U.galleryEyebrow)}</p>
  <h2>${esc(U.galleryTitle)}</h2>
  <div class="gallery">
    ${gallery.map((g) => `<figure><img src="${rp}${g.src}" alt="${esc(g.alt)}" loading="lazy" data-zoom><figcaption>${esc(g.caption)}</figcaption></figure>`).join('\n    ')}
  </div>
</section>`);
      }

      // Raccourcis
      sc = shortcutsFrom(tool.doc(tool.shortcuts.file), tool.shortcuts.section);
      if (sc.length) {
        sections.push(`<section class="wrap section" id="raccourcis">
  <p class="eyebrow">${esc(U.keysEyebrow)}</p>
  <h2>${esc(U.keysTitle(sc.length))}</h2>
  ${shortcutsTable(sc)}
</section>`);
      }

      // Installation, bon à savoir, FAQ
      const install = sectionHtml(tool.doc(tool.install.file), tool.install.section, opts);
      const notes = tool.notes && sectionHtml(tool.doc(tool.notes.file), tool.notes.section, opts);
      const faq = tool.faq ? faqFrom(tool.doc(tool.faq.file), tool.faq.section, opts) : [];
      sections.push(`<section class="band"><div class="wrap two-col" id="demarrer">
  <div class="prose">
    <p class="eyebrow">${esc(tool.live ? U.start : U.install)}</p>
    ${tool.live ? `<h2>${esc(U.nothingToInstall)}</h2><p>${esc(U.runsInBrowser)}</p><p>${btn(tool.live, U.open(tool.name), 'primary', true)}</p><h3>${esc(install?.title || U.runLocally)}</h3>` : `<h2>${esc(install?.title.replace(/^\d+\.\s*/, '') || U.install2)}</h2>`}
    ${install?.html.replace(/<h3 /g, '<h4 ').replace(/<\/h3>/g, '</h4>') || ''}
  </div>
  <div class="prose">
    ${
      faq.length
        ? `<p class="eyebrow">${esc(U.faqEyebrow)}</p><h2>${esc(U.faqTitle)}</h2>${faq.map((f) => `<details><summary>${esc(f.q)}</summary><div>${f.a}</div></details>`).join('')}`
        : notes
          ? `<p class="eyebrow">${esc(U.notesEyebrow)}</p><h2>${esc(notes.title)}</h2>${notes.html}`
          : ''
    }
  </div>
</div></section>`);
    } else {
      // Pas de guide anglais : on n'en recopie rien, on renvoie vers le guide français.
      sections.push(`<section class="band"><div class="wrap prose" id="demarrer">
  <p class="eyebrow">${esc(U.guideNoticeEyebrow)}</p>
  <h2>${esc(U.guideNoticeTitle)}</h2>
  <p>${esc(U.guideNoticeText)}</p>
  ${tool.live ? `<p>${esc(U.guideNoticeLive)}</p>` : ''}
  <p class="actions">${btn(ctaOf(tool, prefix), tool.cta.label, 'primary', isExt(tool.cta.href))}<a class="btn btn-ghost" href="${esc(guideHref)}" hreflang="fr" lang="fr">${esc(U.readGuide)}${icons.arrow}</a></p>
</div></section>`);
    }

    // Nouveautés de l'outil
    sections.push(`<section class="wrap section two-col" id="nouveautes">
  <div>
    <p class="eyebrow">${esc(U.newsEyebrow)}</p>
    <h2>${esc(U.toolNewsTitle(tool.name))}</h2>
    <p class="actions">${btn(`${prefix}nouveautes/#${tool.id}`, U.fullHistory, 'ghost')}</p>
  </div>
  ${newsList(tool.news.slice(0, 10), site, prefix, { showTool: false, L, rp })}
</section>`);

    const cta = ctaOf(tool, prefix);
    const readGuide = `<a class="btn btn-ghost" href="${esc(guideHref)}"${hasDocs ? '' : ' hreflang="fr" lang="fr"'}>${esc(hasDocs ? U.readGuideHere : U.readGuide)}${icons.arrow}</a>`;
    const body = `
<section class="hero hero-tool" style="--c:${tool.accent}">
  <div class="wrap hero-grid">
    <div>
      <p class="eyebrow"><span class="tool-mark sm">${toolMark(tool, rp)}</span>${esc(tool.kind)}</p>
      <h1>${esc(tool.name)}</h1>
      <p class="lead">${esc(tool.pitch)}</p>
      <ul class="checks">${tool.promise.map((p) => `<li>${icons.check}${esc(p)}</li>`).join('')}</ul>
      <p class="muted">${esc(tool.audience)}</p>
      ${licenseLine(tool, U)}
      <div class="actions">
        ${btn(cta, tool.cta.label, 'primary', isExt(cta))}
        ${readGuide}
        <a class="btn btn-link" href="https://github.com/${tool.repo}" target="_blank" rel="noopener">${icons.github} ${esc(U.sourceCode)}</a>
      </div>
    </div>
    ${tool.heroUrl ? `<div class="hero-shot"><img src="${rp}${tool.heroUrl}" alt="${esc(U.interfaceOf(tool.name))}" data-zoom></div>` : ''}
  </div>
  <nav class="wrap subnav" aria-label="${esc(U.onThisPage)}">
    ${[
      ['parcours', U.nav.how, steps.length],
      ['fonctionnalites', U.nav.feat, hasDocs],
      ['captures', U.nav.shots, gallery.length > 1],
      ['raccourcis', U.nav.keys, sc.length],
      ['demarrer', hasDocs ? (tool.live ? U.start : U.install) : U.guideNoticeEyebrow, 1],
      ['nouveautes', U.nav.news, 1],
    ]
      .filter((x) => x[2])
      .map(([id, l]) => `<a href="#${id}">${esc(l)}</a>`)
      .join('')}
    <a href="${esc(guideHref)}"${hasDocs ? '' : ' hreflang="fr" lang="fr"'}>${esc(hasDocs ? U.fullGuideHere : U.fullGuide)}</a>
  </nav>
</section>
${sections.join('\n')}
<section class="cta-band" style="--c:${tool.accent}">
  <div class="wrap">
    <h2>${esc(tool.pitch)}</h2>
    <div class="actions">${btn(cta, tool.cta.label, 'primary', isExt(cta))}${readGuide}</div>
  </div>
</section>`;

    addPage(
      `${tool.id}/index.html`,
      layout({
        site,
        L,
        prefix,
        canonical: `${tool.id}/`,
        active: tool.id,
        title: tool.name,
        description: U.toolDesc(tool.name, tool.pitch),
        body,
        page: {
          kind: 'tool',
          ogImage: tool.heroUrl,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: tool.name,
            description: tool.pitch,
            inLanguage: L.htmlLang,
            applicationCategory: 'MultimediaApplication',
            operatingSystem: tool.live ? (fr ? 'Navigateur web' : 'Web browser') : 'Linux, macOS, Windows (Docker)',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
            url: `${site.siteUrl}/${L.dir}${tool.id}/`,
            codeRepository: `https://github.com/${tool.repo}`,
            dateModified: tool.source.date,
          },
        },
      }),
    );

    // ------------------------------------------------------------ guide complet (dans les langues où l'outil en a un)
    if (hasDocs) {
      const gprefix = '../../';
      const grp = rootOf(gprefix);
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
      // Le sommaire en tête du guide (et le lien vers l'autre langue) font doublon avec la navigation du site.
      const intro = tool.guide.dropIntro || [];
      tokens = tokens.filter((t) => !(t.type === 'paragraph' && intro.some((re) => re.test(t.text))));
      const toc = tokens
        .filter((t) => t.type === 'heading' && (t.depth === 2 || t.depth === 3))
        .map((t) => ({ depth: t.depth, id: slugify(t.text), text: t.text.replace(/[*`]/g, '') }));
      const html = doc.render(tokens, { prefix: gprefix, assetPrefix: grp });
      const body = `
<div class="wrap guide">
  <aside class="toc">
    <a class="toc-back" href="../">← ${esc(tool.name)}</a>
    <p class="toc-title">${esc(U.toc)}</p>
    <nav>${toc.map((t) => `<a class="d${t.depth}" href="#${esc(t.id)}">${esc(t.text)}</a>`).join('')}</nav>
  </aside>
  <article class="prose guide-body">
    <p class="eyebrow">${esc(tool.name)} · ${esc(U.docLabel)}</p>
    <h1>${esc(tool.guide.title)}</h1>
    <p class="doc-meta">${esc(U.generatedFrom)} <a href="https://github.com/${tool.repo}/blob/${tool.source.branch}/${tool.guide.file}" target="_blank" rel="noopener"><code>${esc(tool.guide.file)}</code></a> · ${esc(U.updatedOn)} ${esc(frDate(tool.source.date, true, L.code))}</p>
    ${html}
  </article>
</div>`;
      addPage(
        `${tool.guidePage}index.html`,
        layout({
          site,
          L,
          only: tool.en?.guide ? null : ['fr'],
          prefix: gprefix,
          canonical: tool.guidePage,
          active: tool.id,
          title: `${tool.guide.title} – ${tool.name}`,
          description: U.guideDesc(tool.name, tool.pitch),
          body,
          page: { kind: 'guide', ogImage: tool.heroUrl },
        }),
      );
    }
  }

  // ---------------------------------------------------------------- nouveautés

  {
    const prefix = '../';
    const rp = rootOf(prefix);
    const byMonth = (list) => {
      const groups = new Map();
      for (const n of list) {
        const k = n.date.slice(0, 7);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(n);
      }
      return [...groups];
    };
    const body = `
<section class="hero hero-small"><div class="wrap">
  <p class="eyebrow">${esc(U.newsPageEyebrow)}</p>
  <h1>${esc(U.news)}</h1>
  <p class="lead">${esc(U.newsPageLead)} <a href="${prefix}feed.xml">${icons.rss} ${esc(U.atomLink)}</a></p>
  <div class="filters" role="group" aria-label="${esc(U.filterBy)}">
    <button type="button" class="chip" aria-pressed="true" data-filter="">${esc(U.all)}</button>
    ${site.tools.map((t) => `<button type="button" class="chip" aria-pressed="false" data-filter="${t.id}" id="${t.id}" style="--c:${t.accent}">${esc(t.name)}</button>`).join('')}
  </div>
</div></section>
<section class="wrap section news-page">
  ${byMonth(allNews)
    .map(
      ([k, list]) => `<h2 class="month">${esc(monthName(k + '-15T00:00:00Z', L.code))}</h2>
  <ol class="news">${list.map((e) => newsItem(e, prefix, { dataTool: true, L, rp })).join('')}</ol>`,
    )
    .join('\n  ')}
</section>`;
    addPage(
      'nouveautes/index.html',
      layout({ site, L, prefix, canonical: 'nouveautes/', active: 'news', title: U.news, description: U.newsPageDesc(site.tools.map((t) => t.name)), body, page: { kind: 'news' } }),
    );
  }

  // ---------------------------------------------------------------- 404 (une seule, à la racine), flux Atom

  if (fr) {
    write(
      '404.html',
      layout({
        site,
        L,
        only: ['fr'],
        prefix: '/' + new URL(site.siteUrl).pathname.replace(/^\/|\/$/g, '') + (new URL(site.siteUrl).pathname.length > 1 ? '/' : ''),
        canonical: '404.html',
        title: U.notFound,
        body: `<section class="hero hero-small"><div class="wrap"><h1>${esc(U.notFound)}</h1><p class="lead">${esc(U.notFoundText)}</p><p class="actions">${btn(site.siteUrl + '/', U.backHome)}</p></div></section>`,
        page: { kind: '404' },
      }),
    );
  }

  const xml = (s) => esc(s);
  write(
    `${L.dir}feed.xml`,
    `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${L.htmlLang}">
  <title>${xml(`${site.title} – ${U.news}`)}</title>
  <subtitle>${xml(site.description)}</subtitle>
  <link href="${xml(site.siteUrl)}/${L.dir}feed.xml" rel="self"/>
  <link href="${xml(site.siteUrl)}/${L.dir}nouveautes/"/>
  <id>${xml(site.siteUrl)}/${L.dir}</id>
  <updated>${allNews[0]?.date || site.builtAt}</updated>
${allNews
  .slice(0, 50)
  .map(
    (e) => `  <entry>
    <title>${xml(`${e.tool.name} : ${e.title}`)}</title>
    <link href="${xml(`${site.siteUrl}/${/^[^/]+\/guide\//.test(e.href) && !e.tool.guideHere ? '' : L.dir}${e.href}`)}"/>
    <id>${xml(`${site.siteUrl}/${L.dir}nouveautes/#${e.tool.id}-${e.date.slice(0, 10)}-${slugify(e.title)}`)}</id>
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

  return { allNews, tools, featureCount };
}

const results = locales.map((L) => buildLocale(L, site));
const { allNews, tools: builtTools, featureCount } = results[0];

// ---------------------------------------------------------------- plan du site, versions, fichiers statiques

const xml = (s) => esc(s);
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

console.log(`✓ ${pages.length} pages (${locales.map((l) => l.code).join(' + ')}), ${allNews.length} nouveautés → dist/`);
for (const t of builtTools) console.log(`  ${t.name} @ ${t.source.sha.slice(0, 7)} (${featureCount(t)} fonctionnalités, ${t.news.length} nouveautés)`);
