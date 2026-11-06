// Lecture des documentations Markdown des outils : découpage en sections, rendu HTML avec réécriture
// des liens et des images, extraction des éléments réutilisés sur les pages (fonctionnalités, parcours,
// raccourcis, galerie…).

import path from 'node:path';
import { Marked, Lexer } from 'marked';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const stripTags = (html) =>
  String(html)
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Ancre identique à celle de GitHub, pour garder valides les liens internes des guides. */
export function slugify(text) {
  return stripTags(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s/g, '-');
}

/** Texte brut d'un extrait Markdown (sans balisage). */
export function plain(md) {
  return stripTags(new Marked().parseInline(String(md ?? ''))).trim();
}

/** Coupe un texte à une limite de caractères, de préférence en fin de phrase. */
export function truncate(text, max = 220) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const dot = cut.lastIndexOf('. ');
  if (dot > max * 0.5) return cut.slice(0, dot + 1);
  const pause = Math.max(cut.lastIndexOf(' ; '), cut.lastIndexOf(' : '), cut.lastIndexOf(', '));
  if (pause > max * 0.5) return cut.slice(0, pause).trim() + '…';
  return cut.replace(/\s+\S*$/, '') + '…';
}

const IMAGE_EXT = /\.(webp|png|jpe?g|gif|svg|avif)$/i;

/**
 * Document Markdown d'un outil.
 * ctx : { tool, file, sha, assets (Map chemin dépôt → chemin site), docPages (Map chemin dépôt → page site) }
 */
export class Doc {
  constructor(source, ctx) {
    this.ctx = ctx;
    this.tokens = new Lexer().lex(source);
  }

  /** Sections d'un niveau donné : { title, slug, depth, tokens } (tokens sans le titre). */
  sections(depth = 2) {
    const out = [];
    let cur = null;
    for (const t of this.tokens) {
      if (t.type === 'heading' && t.depth <= depth) {
        cur = t.depth === depth ? { title: plain(t.text), slug: slugify(t.text), depth, tokens: [] } : null;
        if (cur) out.push(cur);
      } else if (cur) cur.tokens.push(t);
    }
    return out;
  }

  /** Première section (niveau 2 ou 3) dont le titre correspond, avec ses sous-sections. */
  section(re) {
    for (let i = 0; i < this.tokens.length; i++) {
      const t = this.tokens[i];
      if (t.type !== 'heading' || t.depth > 3 || !re.test(plain(t.text))) continue;
      const tokens = [];
      for (let j = i + 1; j < this.tokens.length; j++) {
        const u = this.tokens[j];
        if (u.type === 'heading' && u.depth <= t.depth) break;
        tokens.push(u);
      }
      return { title: plain(t.text), slug: slugify(t.text), depth: t.depth, tokens };
    }
    return null;
  }

  /** Toutes les images du document, avec leur légende éventuelle (ligne en italique qui suit). */
  images() {
    const out = [];
    const walk = (tokens) => {
      for (const t of tokens || []) {
        if (t.type === 'paragraph' && t.tokens?.[0]?.type === 'image') {
          const img = t.tokens[0];
          out.push({ src: this.ctx.assetUrl(this.resolve(img.href)), alt: img.text, caption: captionOf(t) || img.text });
        }
        if (t.tokens && t.type !== 'paragraph') walk(t.tokens);
        if (t.items) for (const it of t.items) walk(it.tokens);
      }
    };
    walk(this.tokens);
    return out.filter((i) => i.src);
  }

  /** Chemin d'un lien relatif, à partir de la racine du dépôt de l'outil. */
  resolve(href) {
    return path.posix.normalize(path.posix.join(path.posix.dirname(this.ctx.file), href));
  }

  /** Rendu HTML d'une liste de jetons, pour une page située à `prefix` de la racine du site. */
  render(tokens, { prefix = '', anchorPage = null } = {}) {
    const doc = this;
    const ctx = this.ctx;
    const repoUrl = `https://github.com/${ctx.tool.repo}`;
    const rewrite = (href) => {
      if (!href) return { href };
      if (/^(https?:|mailto:)/i.test(href)) return { href, external: !href.startsWith(ctx.siteUrl) };
      if (href.startsWith('#')) return { href: anchorPage ? prefix + anchorPage + href : href };
      const [p, hash = ''] = href.split('#');
      const repoPath = doc.resolve(p);
      const page = ctx.docPages.get(repoPath);
      if (page) return { href: prefix + page + (hash ? '#' + hash : '') };
      if (IMAGE_EXT.test(repoPath)) return { href: prefix + ctx.assetUrl(repoPath) };
      return { href: `${repoUrl}/blob/${ctx.branch}/${repoPath}${hash ? '#' + hash : ''}`, external: true };
    };
    const marked = new Marked({
      gfm: true,
      renderer: {
        heading({ tokens: inline, depth, text }) {
          const id = slugify(text);
          return `<h${depth} id="${esc(id)}"><a class="anchor" href="#${esc(id)}" aria-hidden="true">#</a>${this.parser.parseInline(inline)}</h${depth}>\n`;
        },
        link({ href, title, tokens: inline }) {
          const r = rewrite(href);
          const ext = r.external ? ' target="_blank" rel="noopener"' : '';
          return `<a href="${esc(r.href)}"${title ? ` title="${esc(title)}"` : ''}${ext}>${this.parser.parseInline(inline)}</a>`;
        },
        image({ href, text }) {
          const r = rewrite(href);
          return `<img src="${esc(r.href)}" alt="${esc(text)}" loading="lazy" decoding="async" data-zoom>`;
        },
        paragraph(t) {
          if (t.tokens?.[0]?.type === 'image') {
            const img = this.parser.parseInline([t.tokens[0]]);
            const cap = captionOf(t);
            return `<figure>${img}${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure>\n`;
          }
          return `<p>${this.parser.parseInline(t.tokens)}</p>\n`;
        },
        code({ text, lang }) {
          return `<pre class="code"${lang ? ` data-lang="${esc(lang)}"` : ''}><code>${esc(text)}</code></pre>\n`;
        },
      },
    });
    const list = Object.assign([...tokens], { links: this.tokens.links || {} });
    return marked
      .parser(list)
      .replace(/<table>/g, '<div class="table-wrap"><table>')
      .replace(/<\/table>/g, '</table></div>');
  }

  renderInline(tokens, opts) {
    return this.render([{ type: 'paragraph', tokens, raw: '', text: '' }], opts)
      .replace(/^<p>/, '')
      .replace(/<\/p>\s*$/, '');
  }
}

function captionOf(paragraph) {
  const lines = paragraph.raw.split('\n').slice(1).join(' ');
  return lines.replace(/[*_]/g, '').trim();
}

// ---------------------------------------------------------------- extraction

/** Cartes de fonctionnalités : une par section de niveau 2 (mode « sections »). */
export function featuresFromSections(doc, { exclude = [] }, guidePage) {
  return doc
    .sections(2)
    .filter((s) => !exclude.some((re) => re.test(s.title)))
    .map((s) => {
      const i = s.tokens.findIndex((t) => t.type === 'paragraph' && t.tokens?.[0]?.type !== 'image');
      const firstPara = s.tokens[i];
      let summary = firstPara ? plain(firstPara.text) : '';
      // « Deux notions distinctes : » suivi d'une liste : le résumé reprend le début de chaque puce.
      if (summary.endsWith(':')) {
        const list = s.tokens.slice(i + 1).find((t) => t.type !== 'space');
        if (list?.type === 'list') {
          summary += ' ' + list.items.map((it) => plain((it.tokens.find((t) => t.type === 'text')?.text ?? it.text).split(/\n\s*[-*+] /)[0]).split(/\.\s|\s;\s|\n/)[0].replace(/[.;:]\s*$/, '').trim()).join(' ; ') + '.';
        }
      }
      const firstImg = findImage(s.tokens);
      const subs = s.tokens.filter((t) => t.type === 'heading' && t.depth === 3).map((t) => plain(t.text));
      return {
        title: s.title.replace(/^\d+\.\s*/, '').replace(/\s*\(.*\)$/, ''),
        summary: truncate(summary),
        image: firstImg ? doc.ctx.assetUrl(doc.resolve(firstImg.href)) : null,
        imageAlt: firstImg?.text || '',
        points: subs,
        href: guidePage + '#' + s.slug,
      };
    });
}

/** Fonctionnalités en liste (mode « items ») : lignes de tableaux et puces commençant par du gras. */
export function featuresFromItems(doc, { section }, guidePage) {
  const sec = doc.section(section);
  if (!sec) return [];
  const groups = [];
  let cur = { title: sec.title, slug: sec.slug, items: [] };
  groups.push(cur);
  for (const t of sec.tokens) {
    if (t.type === 'heading') {
      cur = { title: plain(t.text), slug: slugify(t.text), items: [] };
      groups.push(cur);
    } else if (t.type === 'table' && !/touche/i.test(t.header[0]?.text)) {
      for (const row of t.rows) {
        cur.items.push({
          title: plain(row[0].text).replace(/\s*\([A-Z]\)$/, ''),
          key: (row[0].text.match(/\(([A-Z])\)/) || [])[1] || null,
          text: row.slice(1).map((c) => plain(c.text)).join(' — '),
        });
      }
    } else if (t.type === 'list') {
      for (const it of t.items) {
        const m = it.text.match(/^\*\*(.+?)\*\*\s*(?:\(([^)]+)\))?\s*[:—-]?\s*([\s\S]*)$/);
        if (!m) continue;
        const body = m[3].split(/\n\s*[-*+] /)[0];
        const text = truncate(plain(body), 260);
        cur.items.push({ title: plain(m[1]), key: m[2] && m[2].length <= 3 ? m[2] : null, text: text.charAt(0).toUpperCase() + text.slice(1) });
      }
    }
  }
  return groups.filter((g) => g.items.length).map((g) => ({ ...g, href: guidePage + '#' + g.slug }));
}

function findImage(tokens) {
  for (const t of tokens || []) {
    if (t.type === 'image') return t;
    const sub = t.tokens || (t.items ? t.items.flatMap((i) => i.tokens) : null);
    const f = sub && findImage(sub);
    if (f) return f;
  }
  return null;
}

/** Étapes : première liste numérotée d'une section. */
export function stepsFrom(doc, re, opts) {
  const sec = doc.section(re);
  const list = sec?.tokens.find((t) => t.type === 'list' && t.ordered);
  if (!list) return [];
  return list.items.map((it) => {
    const first = it.tokens.find((t) => t.type === 'text' || t.type === 'paragraph');
    const html = first ? doc.renderInline(first.tokens || [], opts) : '';
    const m = html.match(/^<strong>(.+?)<\/strong>\s*(?:\([^)]*\))?\s*[:—]?\s*([\s\S]*)$/);
    const nested = it.tokens.find((t) => t.type === 'list');
    return {
      title: m ? stripTags(m[1]) : null,
      html: m ? m[2] : html,
      sub: nested ? doc.render([nested], opts) : '',
    };
  });
}

/** Première table de raccourcis (en-tête « Touche ») d'une section. */
export function shortcutsFrom(doc, re) {
  const sec = doc.section(re);
  const table = sec?.tokens.find((t) => t.type === 'table' && /touche/i.test(t.header[0]?.text));
  if (!table) return [];
  return table.rows.map((r) => ({
    keys: r[0].text
      .split(/\s+(?:ou|\/)\s+|,\s*/)
      .map((k) => k.replace(/[`*]/g, '').trim())
      .filter(Boolean),
    keysRaw: plain(r[0].text),
    action: plain(r[1].text),
  }));
}

/** Questions fréquentes : paragraphes commençant par une question en gras. */
export function faqFrom(doc, re, opts) {
  const sec = doc.section(re);
  if (!sec) return [];
  const out = [];
  for (const t of sec.tokens) {
    if (t.type === 'paragraph' && t.tokens?.[0]?.type === 'strong') {
      out.push({ q: plain(t.tokens[0].text), a: doc.renderInline(t.tokens.slice(1), opts) });
    } else if (out.length && t.type !== 'space' && t.type !== 'hr') {
      out[out.length - 1].a += doc.render([t], opts);
    }
  }
  return out;
}

/** Tableau d'avancement : { done: [...], next: [...] } à partir de la colonne « État ». */
export function statusFrom(doc, re, opts) {
  const sec = doc.section(re);
  const table = sec?.tokens.find((t) => t.type === 'table');
  if (!table) return null;
  const done = [];
  const next = [];
  for (const r of table.rows) {
    const state = plain(r[r.length - 1].text);
    const item = { phase: plain(r[0].text), html: doc.renderInline(r[1].tokens, opts), state };
    (/✅/.test(state) ? done : next).push(item);
  }
  return { done, next };
}

export function sectionHtml(doc, re, opts) {
  const sec = doc.section(re);
  return sec ? { title: sec.title, html: doc.render(sec.tokens, opts) } : null;
}
