// Liste ce qui a changé dans les dépôts des outils depuis la dernière revue des nouveautés
// (champ « reviewed » de content/nouveautes.json). Utilisé par le skill /update-site.
//
//   node scripts/pending.mjs              rapport Markdown : commits, fichiers touchés, diff de la doc
//   node scripts/pending.mjs --mark       enregistre le dernier commit de chaque outil comme revu
//   SOURCES_DIR=..                        utilise des clones locaux au lieu de .cache/

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../site.config.mjs';
import { fetchSource } from './sources.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const newsFile = path.join(root, 'content/nouveautes.json');
const news = JSON.parse(fs.readFileSync(newsFile, 'utf8'));
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 << 20 }).trim();
const mark = process.argv.includes('--mark');

const out = [];
for (const tool of config.tools) {
  const src = fetchSource(tool, path.join(root, '.cache'));
  const reviewed = news.reviewed?.[tool.repo];
  let known = false;
  if (reviewed) {
    try {
      git(src.dir, 'cat-file', '-e', `${reviewed}^{commit}`);
      known = true;
    } catch {
      /* commit absent de l'historique récupéré */
    }
  }
  const range = known ? [`${reviewed}..HEAD`] : ['-n', '30'];

  if (mark) {
    news.reviewed[tool.repo] = src.sha;
    continue;
  }

  out.push(`## ${tool.name} (${tool.repo}) — id « ${tool.id} »`);
  out.push(`Dernier commit revu : ${reviewed ? reviewed.slice(0, 7) : 'aucun'}${reviewed && !known ? ' (introuvable : 30 derniers commits affichés)' : ''} · HEAD : ${src.sha.slice(0, 7)}`);
  const log = git(src.dir, 'log', '--no-merges', '--date=short', '--format=@@%h %ad %s%n%b', '--name-only', ...range);
  if (!log) {
    out.push('', 'Rien de nouveau.', '');
    continue;
  }
  out.push('', '### Commits (du plus récent au plus ancien)', '', '```', log.replace(/\n{3,}/g, '\n\n'), '```');
  if (known) {
    const docs = [tool.guide.file, 'README.md', ...new Set([tool.features.file, tool.workflow?.file].filter(Boolean))];
    const diff = git(src.dir, 'diff', '--unified=1', `${reviewed}..HEAD`, '--', ...new Set(docs));
    if (diff) {
      const lines = diff.split('\n');
      out.push('', `### Changements de la documentation utilisateur${lines.length > 600 ? ' (tronqués à 600 lignes)' : ''}`, '', '```diff', lines.slice(0, 600).join('\n'), '```');
    }
  }
  out.push('');
}

if (mark) {
  fs.writeFileSync(newsFile, JSON.stringify(news, null, 2) + '\n');
  console.log('Commits revus enregistrés :', news.reviewed);
} else {
  console.log(out.join('\n'));
}
