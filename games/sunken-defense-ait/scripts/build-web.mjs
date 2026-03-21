import { cp, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..');
const OUTDIR = path.join(PACKAGE_ROOT, 'dist');

const LEGAL_PAGES = ['about.html', 'contact.html', 'dmca.html', 'privacy.html', 'terms.html'];
const DIRECTORY_COPIES = [
  {
    source: path.join(REPO_ROOT, 'assets', 'audio', 'kenney_impact'),
    destination: path.join(OUTDIR, 'assets', 'audio', 'kenney_impact'),
  },
  {
    source: path.join(REPO_ROOT, 'assets', 'kenney_tanks', 'png'),
    destination: path.join(OUTDIR, 'assets', 'kenney_tanks', 'png'),
  },
];

const RAW_FILES = [
  {
    source: path.join(REPO_ROOT, 'sunken-sixway-defense', 'style.css'),
    destination: path.join(OUTDIR, 'style.css'),
  },
  {
    source: path.join(REPO_ROOT, 'sunken-sixway-defense', 'toss-bridge.js'),
    destination: path.join(OUTDIR, 'toss-bridge.js'),
  },
  {
    source: path.join(REPO_ROOT, 'assets', 'js', 'neon-audio.js'),
    destination: path.join(OUTDIR, 'assets', 'js', 'neon-audio.js'),
  },
  {
    source: path.join(REPO_ROOT, 'assets', 'js', 'server-config.js'),
    destination: path.join(OUTDIR, 'assets', 'js', 'server-config.js'),
  },
  {
    source: path.join(REPO_ROOT, 'assets', 'audio', 'battleThemeA.mp3'),
    destination: path.join(OUTDIR, 'assets', 'audio', 'battleThemeA.mp3'),
  },
  {
    source: path.join(REPO_ROOT, 'assets', 'css', 'site-quality.css'),
    destination: path.join(OUTDIR, 'assets', 'css', 'site-quality.css'),
  },
];

const LEGAL_LINK_REWRITES = [
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

function rewriteIndex(contents) {
  return contents
    .replace('<a class="mode-tab" href="./multi.html">멀티</a>', '<button class="mode-tab" type="button" disabled>멀티 준비 중</button>')
    .replaceAll('../privacy.html', './privacy.html')
    .replaceAll('../terms.html', './terms.html')
    .replaceAll('../contact.html', './contact.html')
    .replaceAll('../assets/js/neon-audio.js', './assets/js/neon-audio.js')
    .replaceAll('../assets/js/server-config.js', './assets/js/server-config.js');
}

function rewriteGame(contents) {
  return contents
    .replaceAll('../assets/audio/', './assets/audio/')
    .replaceAll('../assets/kenney_tanks/png/', './assets/kenney_tanks/png/')
    .replaceAll('../index.html', './index.html');
}

function rewriteLegalPage(contents) {
  let rewritten = contents;
  for (const [from, to] of LEGAL_LINK_REWRITES) {
    rewritten = rewritten.replaceAll(from, to);
  }
  return rewritten;
}

async function buildSunkenDefenseWebBundle() {
  await rm(OUTDIR, { recursive: true, force: true });
  await mkdir(OUTDIR, { recursive: true });

  await writeTransformedFile(
    path.join(REPO_ROOT, 'sunken-sixway-defense', 'index.html'),
    path.join(OUTDIR, 'index.html'),
    rewriteIndex,
  );

  await writeTransformedFile(
    path.join(REPO_ROOT, 'sunken-sixway-defense', 'game.js'),
    path.join(OUTDIR, 'game.js'),
    rewriteGame,
  );

  for (const file of RAW_FILES) {
    await copyRawFile(file.source, file.destination);
  }

  for (const directory of DIRECTORY_COPIES) {
    await cp(directory.source, directory.destination, { recursive: true });
  }

  for (const page of LEGAL_PAGES) {
    await writeTransformedFile(
      path.join(REPO_ROOT, page),
      path.join(OUTDIR, page),
      rewriteLegalPage,
    );
  }
}

buildSunkenDefenseWebBundle().catch((error) => {
  console.error('[sunken-defense-ait] Failed to prepare web bundle.');
  console.error(error);
  process.exit(1);
});
