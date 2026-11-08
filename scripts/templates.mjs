// Gabarits HTML des pages du site.

import { esc } from './markdown.mjs';

import { formatDate, locales, ui } from './i18n.mjs';

export const frDate = (iso, long = false, code = 'fr') => formatDate(iso, code, long);

// ---------------------------------------------------------------- icônes

export const icons = {
  logo: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lg-site" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#0ea5e9"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient></defs><circle cx="32" cy="32" r="24" fill="none" stroke="url(#lg-site)" stroke-width="5" stroke-dasharray="120 31" transform="rotate(-30 32 32)"/><path d="M14 46 C 24 40, 26 28, 34 26 S 46 22, 50 16" fill="none" stroke="#f97316" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="0.1 7"/><circle cx="34" cy="26" r="5.5" fill="#ea580c" stroke="#fff" stroke-width="2.5"/></svg>`,
  fixexif: `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="24" fill="none" stroke="#f97316" stroke-width="5"/><path d="M8 36 L56 28" stroke="#ea580c" stroke-width="4" stroke-linecap="round"/><path d="M8 32 H56" stroke="#0ea5e9" stroke-width="3" stroke-linecap="round" stroke-dasharray="4 5"/><circle cx="32" cy="32" r="4.5" fill="#fff" stroke="#ea580c" stroke-width="3"/></svg>`,
  github: `<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`,
  check: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  arrow: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-4-4 4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  external: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11 4h5v5m0-5-7 7M14 12v4H4V6h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  rss: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="5" cy="15" r="2" fill="currentColor"/><path d="M3 9a8 8 0 0 1 8 8M3 3a14 14 0 0 1 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  sun: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 1.5v2.2M10 16.3v2.2M1.5 10h2.2M16.3 10h2.2M4 4l1.6 1.6M14.4 14.4 16 16M4 16l1.6-1.6M14.4 5.6 16 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  moon: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 12.5A7 7 0 0 1 7.5 4a7 7 0 1 0 8.5 8.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
};

export function toolMark(tool, prefix) {
  if (tool.logoUrl) return `<img src="${prefix}${tool.logoUrl}" alt="" width="40" height="40">`;
  return icons.fixexif;
}

// ---------------------------------------------------------------- mise en page

export function layout({ site, page, prefix, title, description, body, active, canonical, L = locales[0], only = null, home = false }) {
  const U = ui[L.code];
  // `prefix` mène à la racine de la langue (pages), `rp` à la racine du site (ressources communes).
  const rp = prefix + (L.dir ? '../' : '');
  const nav = [
    ['', U.home, 'home'],
    ...site.tools.map((t) => [`${t.id}/`, t.name, t.id]),
    ['nouveautes/', U.news, 'news'],
  ];
  const fullTitle = title ? `${title} · ${site.title}` : `${site.title} · ${site.tagline}`;
  const desc = description || site.description;
  const url = (loc, path) => site.siteUrl + '/' + loc.dir + path;
  // Pages disponibles dans plusieurs langues : balises hreflang + bouton de bascule.
  const langs = locales.filter((l) => !only || only.includes(l.code));
  const other = locales.find((l) => l.code !== L.code);
  const hasOther = langs.includes(other);
  const switchHref = hasOther ? `${rp}${other.dir}${canonical}` : `${rp}${other.dir}`;
  const alternates = langs.length > 1
    ? langs.map((l) => `<link rel="alternate" hreflang="${l.htmlLang}" href="${esc(url(l, canonical))}">`).join('\n') +
      `\n<link rel="alternate" hreflang="x-default" href="${esc(url(locales[0], canonical))}">\n`
    : '';
  return `<!doctype html>
<html lang="${L.htmlLang}" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url(L, canonical))}">
${alternates}<meta property="og:type" content="website">
<meta property="og:locale" content="${L.ogLocale}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url(L, canonical))}">
${page.ogImage ? `<meta property="og:image" content="${esc(site.siteUrl + '/' + page.ogImage)}">\n<meta name="twitter:card" content="summary_large_image">` : ''}
<meta name="theme-color" content="#0b1f33">
<link rel="icon" href="${rp}assets/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/atom+xml" title="${esc(U.feedTitle(site.title))}" href="${prefix}feed.xml">
<link rel="stylesheet" href="${rp}assets/style.css?v=${site.buildId}">
<script>try{var t=localStorage.getItem('pt.theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
${page.jsonLd ? `<script type="application/ld+json">${JSON.stringify(page.jsonLd)}</script>` : ''}
</head>
<body class="page-${esc(page.kind)}">
<a class="skip" href="#contenu">${esc(U.skip)}</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="${prefix || './'}">${icons.logo}<span>${esc(site.title)}</span></a>
    <a class="lang-switch" href="${esc(switchHref)}" hreflang="${other.htmlLang}" lang="${other.htmlLang}" title="${esc(ui[other.code].switchTo)}" aria-label="${esc(ui[other.code].switchTo)}">${other.short}</a>
    <button class="nav-toggle" aria-expanded="false" aria-controls="nav" aria-label="${esc(U.menu)}"><span></span><span></span><span></span></button>
    <nav id="nav" class="site-nav">
      ${nav.map(([href, label, key]) => `<a href="${prefix}${href}"${key === active ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('\n      ')}
      <a class="nav-gh" href="${esc(site.repo)}" target="_blank" rel="noopener" aria-label="${esc(U.sourceOfSite)}">${icons.github}</a>
      <button class="theme-toggle" type="button" aria-label="${esc(U.themeToggle)}">${icons.moon}${icons.sun}</button>
    </nav>
  </div>
</header>
<main id="contenu">
${body}
</main>
<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <a class="brand" href="${prefix || './'}">${icons.logo}<span>${esc(site.title)}</span></a>
      <p class="muted">${U.footerAbout}</p>
    </div>
    <div>
      <h2>${esc(U.tools)}</h2>
      ${site.tools.map((t) => `<a href="${prefix}${t.id}/">${esc(t.name)}</a><a href="${rp}${t.id}/guide/"${L.code === 'fr' ? '' : ' hreflang="fr" lang="fr"'}>${esc(U.guideOf(t.name))}</a>`).join('')}
    </div>
    <div>
      <h2>${esc(U.follow)}</h2>
      <a href="${prefix}nouveautes/">${esc(U.news)}</a>
      <a href="${prefix}feed.xml">${icons.rss} ${esc(U.atom)}</a>
      ${site.tools.map((t) => `<a href="https://github.com/${t.repo}" target="_blank" rel="noopener">${esc(U.onGithub(t.name))}</a>`).join('')}
    </div>
  </div>
  <div class="wrap disclaimer">
    ${U.disclaimer}
  </div>
  <div class="wrap footer-meta">
    ${U.regenerated(esc(frDate(site.builtAt, true, L.code)), site.tools.map((t) => `<a href="https://github.com/${t.repo}/commit/${t.source.sha}" target="_blank" rel="noopener">${esc(t.name)} <code>${t.source.sha.slice(0, 7)}</code></a>`))}
  </div>
</footer>
<div class="lightbox" hidden><button type="button" aria-label="×">×</button><figure><img alt=""><figcaption></figcaption></figure></div>
<script src="${rp}assets/site.js?v=${site.buildId}" defer></script>
</body>
</html>
`;
}

// ---------------------------------------------------------------- blocs

export function newsItem(e, prefix, { showTool = true, dataTool = false, L = locales[0], rp = prefix } = {}) {
  const U = ui[L.code];
  // Les ancres de guide pointent vers le guide français (seule version existante) ; le reste reste dans la langue.
  const href = /^[^/]+\/guide\//.test(e.href) ? `${rp}${e.href}` : `${prefix}${e.href}`;
  const fr = L.code !== 'fr' && /^[^/]+\/guide\//.test(e.href);
  return `<li class="news-item"${dataTool ? ` data-tool="${e.tool.id}"` : ''}>
    <time datetime="${e.date}">${esc(frDate(e.date, false, L.code))}</time>
    <div>
      <p class="news-head">${showTool ? `<a class="tool-chip" style="--c:${e.tool.accent}" href="${prefix}${e.tool.id}/">${esc(e.tool.name)}</a>` : ''}${e.isNew ? `<span class="badge-new">${esc(U.badgeNew)}</span>` : ''}<a class="news-title" href="${esc(href)}"${fr ? ' hreflang="fr"' : ''}>${esc(e.title)}</a></p>
      ${e.text ? `<p class="news-text">${esc(e.text)}</p>` : ''}
    </div>
  </li>`;
}

export function newsList(entries, site, prefix, opts = {}) {
  const U = ui[(opts.L || locales[0]).code];
  if (!entries.length) return `<p class="muted">${esc(U.noNews)}</p>`;
  return `<ol class="news">\n${entries.map((e) => newsItem(e, prefix, opts)).join('\n')}\n</ol>`;
}

export function shortcutsTable(shortcuts) {
  return `<div class="shortcuts">
${shortcuts
  .map(
    (s) => `  <div class="sc"><span class="keys">${s.keys.map((k) => `<kbd>${esc(k)}</kbd>`).join('<span class="or">/</span>')}</span><span>${esc(s.action)}</span></div>`,
  )
  .join('\n')}
</div>`;
}

/** Illustration du héros : une trace sur un fond de carte stylisé, des photos 360° le long du parcours. */
export const heroArt = (label, t) => `<svg class="hero-art" viewBox="0 0 520 420" role="img" aria-label="${esc(label)}">
  <defs>
    <linearGradient id="ha-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--map-a)"/><stop offset="1" stop-color="var(--map-b)"/></linearGradient>
    <linearGradient id="ha-ring" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#0ea5e9"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient>
    <clipPath id="ha-clip"><rect x="10" y="10" width="500" height="400" rx="28"/></clipPath>
  </defs>
  <rect x="10" y="10" width="500" height="400" rx="28" fill="url(#ha-bg)"/>
  <g clip-path="url(#ha-clip)" fill="none" stroke="var(--map-road)" stroke-linecap="round">
    <path d="M-20 300 C 90 280, 140 330, 260 300 S 420 230, 560 260" stroke-width="16"/>
    <path d="M120 -20 C 140 90, 90 180, 150 260 S 220 380, 200 460" stroke-width="10"/>
    <path d="M330 -20 C 320 80, 380 140, 360 230 S 400 360, 450 460" stroke-width="10"/>
    <path d="M-20 120 C 120 140, 260 90, 560 120" stroke-width="6"/>
    <path d="M40 400 C 120 360, 200 380, 280 350" stroke-width="5"/>
    <path d="M400 30 C 440 80, 480 70, 540 110" stroke-width="5"/>
    <rect x="210" y="150" width="70" height="46" rx="6" fill="var(--map-block)" stroke="none"/>
    <rect x="410" y="300" width="60" height="70" rx="6" fill="var(--map-block)" stroke="none"/>
    <rect x="30" y="170" width="70" height="60" rx="6" fill="var(--map-park)" stroke="none"/>
  </g>
  <path class="ha-track" d="M60 360 C 110 320, 130 260, 170 235 S 250 200, 300 205 S 380 170, 400 120 S 440 60, 470 50" fill="none" stroke="#f97316" stroke-width="5" stroke-linecap="round"/>
  <g class="ha-dots" fill="#ea580c" stroke="#fff" stroke-width="2">
    <circle cx="60" cy="360" r="5"/><circle cx="92" cy="333" r="5"/><circle cx="118" cy="296" r="5"/><circle cx="145" cy="256" r="5"/>
    <circle cx="186" cy="228" r="5"/><circle cx="224" cy="213" r="5"/><circle cx="262" cy="205" r="5"/><circle cx="300" cy="205" r="5"/>
    <circle cx="340" cy="196" r="5"/><circle cx="372" cy="170" r="5"/><circle cx="395" cy="132" r="5"/><circle cx="418" cy="94" r="5"/><circle cx="444" cy="64" r="5"/>
  </g>
  <g class="ha-cur" transform="translate(300 205)">
    <circle r="46" fill="var(--surface)" opacity=".55"/>
    <path d="M 33 -17 A 37 37 0 1 0 37 4" fill="none" stroke="url(#ha-ring)" stroke-width="7" stroke-linecap="round"/>
    <path d="M 24 -24 L 38 -33 L 41 -16 Z" fill="#1d4ed8"/>
    <path d="M0 0 L 22 -10" stroke="#0ea5e9" stroke-width="4" stroke-linecap="round"/>
    <circle r="10" fill="#ea580c" stroke="#fff" stroke-width="3.5"/>
  </g>
  <g transform="translate(330 300)">
    <rect width="160" height="78" rx="14" fill="var(--surface)" stroke="var(--line)"/>
    <text x="16" y="28" class="ha-label">${esc(t.delay)}</text>
    <text x="16" y="56" class="ha-value">${esc(t.delayValue)}</text>
    <path d="M110 52 l14 -16 l14 10 l14 -22" fill="none" stroke="#0ea5e9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(36 40)">
    <rect width="150" height="64" rx="14" fill="var(--surface)" stroke="var(--line)"/>
    <text x="16" y="27" class="ha-label">${esc(t.heading)}</text>
    <text x="16" y="50" class="ha-value">${esc(t.headingValue)}</text>
  </g>
</svg>`;
