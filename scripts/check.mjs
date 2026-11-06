// Vérifie le site généré : liens internes, images et ancres doivent exister dans dist/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const htmlFiles = [];
const walk = (d) => {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (f.name.endsWith('.html') && f.name !== '404.html') htmlFiles.push(p);
  }
};
walk(dist);

const ids = new Map();
const idsOf = (file) => {
  if (!ids.has(file)) {
    const html = fs.readFileSync(file, 'utf8');
    ids.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return ids.get(file);
};

const errors = [];
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  for (const [, attr, raw] of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
    const url = raw.replace(/&amp;/g, '&');
    if (/^(https?:|mailto:|data:)/.test(url) || url === '') continue;
    const [p, hash] = url.split('#');
    let target = p ? path.resolve(path.dirname(file), p.split('?')[0]) : file;
    if (p && (p.endsWith('/') || fs.existsSync(target) && fs.statSync(target).isDirectory())) target = path.join(target, 'index.html');
    const rel = path.relative(dist, file);
    if (!fs.existsSync(target)) {
      errors.push(`${rel} : ${attr}="${raw}" introuvable`);
      continue;
    }
    if (hash && target.endsWith('.html') && !idsOf(target).has(decodeURIComponent(hash))) {
      errors.push(`${rel} : ancre #${hash} absente de ${path.relative(dist, target)}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`✗ ${errors.length} lien(s) cassé(s)`);
  process.exit(1);
}
console.log(`✓ ${htmlFiles.length} pages vérifiées, aucun lien cassé`);
