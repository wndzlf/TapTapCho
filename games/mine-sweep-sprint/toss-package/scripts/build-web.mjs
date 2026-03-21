import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..', '..', '..');
const OUTDIR = path.join(PACKAGE_ROOT, 'dist');

const LEGAL_PAGES = ['about.html', 'contact.html', 'dmca.html', 'privacy.html', 'terms.html'];
const LINK_REWRITES = [
  ['href="/assets/css/site-quality.css"', 'href="./assets/css/site-quality.css"'],
  ['href="/index.html"', 'href="./index.html"'],
  ['href="/about.html"', 'href="./about.html"'],
  ['href="/contact.html"', 'href="./contact.html"'],
  ['href="/privacy.html"', 'href="./privacy.html"'],
  ['href="/terms.html"', 'href="./terms.html"'],
  ['href="/dmca.html"', 'href="./dmca.html"'],
];

async function ensureParentDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function writeTransformedFile(sourcePath, destinationPath, transform) {
  await ensureParentDir(destinationPath);
  const contents = await readFile(sourcePath, 'utf8');
  await writeFile(destinationPath, transform(contents), 'utf8');
}

async function copyRawFile(sourcePath, destinationPath) {
  await ensureParentDir(destinationPath);
  await copyFile(sourcePath, destinationPath);
}

function rewriteLegalPage(contents) {
  let rewritten = contents;
  for (const [from, to] of LINK_REWRITES) {
    rewritten = rewritten.replaceAll(from, to);
  }
  return rewritten;
}

async function buildMineSweepSprintWebBundle() {
  await rm(OUTDIR, { recursive: true, force: true });
  await mkdir(OUTDIR, { recursive: true });

  await writeTransformedFile(
    path.join(REPO_ROOT, 'games', 'mine-sweep-sprint', 'index.html'),
    path.join(OUTDIR, 'index.html'),
    (contents) =>
      contents
        .replace('src="../assets/js/neon-audio.js"', 'src="./assets/js/neon-audio.js"')
        .replaceAll('../privacy.html', './privacy.html')
        .replaceAll('../terms.html', './terms.html')
        .replaceAll('../contact.html', './contact.html'),
  );

  await copyRawFile(path.join(REPO_ROOT, 'games', 'mine-sweep-sprint', 'game.js'), path.join(OUTDIR, 'game.js'));
  await copyRawFile(path.join(REPO_ROOT, 'games', 'mine-sweep-sprint', 'style.css'), path.join(OUTDIR, 'style.css'));
  await copyRawFile(path.join(REPO_ROOT, 'games', 'mine-sweep-sprint', 'toss-bridge.js'), path.join(OUTDIR, 'toss-bridge.js'));
  await copyRawFile(path.join(REPO_ROOT, 'shared', 'js', 'neon-audio.js'), path.join(OUTDIR, 'assets', 'js', 'neon-audio.js'));
  await copyRawFile(path.join(REPO_ROOT, 'static', 'assets', 'css', 'site-quality.css'), path.join(OUTDIR, 'assets', 'css', 'site-quality.css'));

  for (const page of LEGAL_PAGES) {
    await writeTransformedFile(
      path.join(REPO_ROOT, 'static', 'site', page),
      path.join(OUTDIR, page),
      rewriteLegalPage,
    );
  }
}

buildMineSweepSprintWebBundle().catch((error) => {
  console.error('[mine-sweep-sprint/toss-package] Failed to prepare web bundle.');
  console.error(error);
  process.exit(1);
});
