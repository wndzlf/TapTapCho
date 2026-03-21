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

async function buildCrimsonHunterBundle() {
  await rm(OUTDIR, { recursive: true, force: true });
  await mkdir(OUTDIR, { recursive: true });

  await writeTransformedFile(
    path.join(REPO_ROOT, 'games', 'crimson-hunter-trials', 'index.html'),
    path.join(OUTDIR, 'index.html'),
    (contents) =>
      contents
        .replace('  <link rel="stylesheet" href="../assets/css/site-quality.css" />\n', '')
        .replace('src="../assets/js/neon-audio.js"', 'src="./assets/js/neon-audio.js"')
        .replace('  <script src="../assets/js/site-quality.js"></script>\n', ''),
  );

  await copyRawFile(path.join(REPO_ROOT, 'games', 'crimson-hunter-trials', 'game.js'), path.join(OUTDIR, 'game.js'));
  await copyRawFile(path.join(REPO_ROOT, 'games', 'crimson-hunter-trials', 'style.css'), path.join(OUTDIR, 'style.css'));
  await copyRawFile(path.join(REPO_ROOT, 'games', 'crimson-hunter-trials', 'toss-bridge.js'), path.join(OUTDIR, 'toss-bridge.js'));
  await copyRawFile(path.join(REPO_ROOT, 'shared', 'js', 'neon-audio.js'), path.join(OUTDIR, 'assets', 'js', 'neon-audio.js'));

  for (const page of LEGAL_PAGES) {
    await writeTransformedFile(
      path.join(REPO_ROOT, 'static', 'site', page),
      path.join(OUTDIR, page),
      rewriteLegalPage,
    );
  }
}

buildCrimsonHunterBundle().catch((error) => {
  console.error('[crimson-hunter-trials/toss-package] Failed to prepare web bundle.');
  console.error(error);
  process.exit(1);
});
