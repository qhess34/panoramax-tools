// Récupération des dépôts des outils (clone superficiel) et de leur historique.
//
// SOURCES_DIR=/chemin : utilise des clones déjà présents (<SOURCES_DIR>/<nom du dépôt>) au lieu de cloner,
// pratique pour prévisualiser une documentation pas encore poussée.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

export function fetchSource(tool, cacheDir) {
  const name = tool.repo.split('/')[1];
  const local = process.env.SOURCES_DIR && path.join(process.env.SOURCES_DIR, name);
  let dir;
  if (local && fs.existsSync(path.join(local, '.git'))) {
    dir = local;
  } else {
    dir = path.join(cacheDir, name);
    const url = `https://github.com/${tool.repo}.git`;
    if (fs.existsSync(path.join(dir, '.git'))) {
      git(dir, 'fetch', '--quiet', '--depth', '300', 'origin', 'HEAD');
      git(dir, 'reset', '--quiet', '--hard', 'FETCH_HEAD');
    } else {
      fs.mkdirSync(cacheDir, { recursive: true });
      git(cacheDir, 'clone', '--quiet', '--depth', '300', url, name);
    }
  }
  const sha = git(dir, 'rev-parse', 'HEAD');
  let branch = 'main';
  try {
    branch = git(dir, 'rev-parse', '--abbrev-ref', 'origin/HEAD').replace(/^origin\//, '') || 'main';
  } catch {
    /* clone local sans origin/HEAD */
  }
  const log = git(dir, 'log', '--no-merges', '-n', '300', '--format=%H%x1f%cI%x1f%s');
  const commits = log
    ? log.split('\n').map((l) => {
        const [hash, date, subject] = l.split('\x1f');
        return { sha: hash, date, subject };
      })
    : [];
  return {
    dir,
    sha,
    branch,
    date: commits[0]?.date || new Date().toISOString(),
    commits,
    read: (p) => fs.readFileSync(path.join(dir, p), 'utf8'),
    exists: (p) => fs.existsSync(path.join(dir, p)),
    abs: (p) => path.join(dir, p),
  };
}
