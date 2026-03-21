import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..', '..', '..');
const APP_ROOT = path.join(REPO_ROOT, 'games', 'godot-air-striker-web');
const OUTDIR = path.join(PACKAGE_ROOT, 'dist');

const LEGAL_PAGES = ['about.html', 'contact.html', 'dmca.html', 'privacy.html', 'terms.html'];
const RAW_FILES = ['style.css', 'toss-bridge.js'];
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

async function copyRawFile(sourcePath, destinationPath) {
  await ensureParentDir(destinationPath);
  await copyFile(sourcePath, destinationPath);
}

async function writeTransformedFile(sourcePath, destinationPath, transform) {
  await ensureParentDir(destinationPath);
  const contents = await readFile(sourcePath, 'utf8');
  await writeFile(destinationPath, transform(contents), 'utf8');
}

function rewriteIndex(contents) {
  return contents
    .replaceAll('../privacy.html', './privacy.html')
    .replaceAll('../terms.html', './terms.html')
    .replaceAll('../contact.html', './contact.html');
}

function rewriteGame(contents) {
  return contents
    .replaceAll(
      '../assets/audio/air-striker-lite-bgm-pixabay-301284.mp3',
      './assets/audio/air-striker-lite-bgm-pixabay-301284.mp3',
    )
    .replace(
      "window.location.href = new URL('../', window.location.href).toString();",
      "window.location.href = new URL('./', window.location.href).toString();",
    );
}

function rewriteLegalPage(contents) {
  let rewritten = contents;
  for (const [from, to] of LINK_REWRITES) {
    rewritten = rewritten.replaceAll(from, to);
  }
  return rewritten;
}

async function buildAirStrikerLiteBundle() {
  await rm(OUTDIR, { recursive: true, force: true });
  await mkdir(OUTDIR, { recursive: true });

  await writeTransformedFile(path.join(APP_ROOT, 'index.html'), path.join(OUTDIR, 'index.html'), rewriteIndex);
  await writeTransformedFile(path.join(APP_ROOT, 'game.js'), path.join(OUTDIR, 'game.js'), rewriteGame);

  for (const file of RAW_FILES) {
    await copyRawFile(path.join(APP_ROOT, file), path.join(OUTDIR, file));
  }

  await copyRawFile(
    path.join(REPO_ROOT, 'static', 'sounds', 'air-striker-lite-bgm-pixabay-301284.mp3'),
    path.join(OUTDIR, 'assets', 'audio', 'air-striker-lite-bgm-pixabay-301284.mp3'),
  );

  await copyRawFile(
    path.join(REPO_ROOT, 'static', 'assets', 'css', 'site-quality.css'),
    path.join(OUTDIR, 'assets', 'css', 'site-quality.css'),
  );

  for (const page of LEGAL_PAGES) {
    await writeTransformedFile(
      path.join(REPO_ROOT, 'static', 'site', page),
      path.join(OUTDIR, page),
      rewriteLegalPage,
    );
  }
}

buildAirStrikerLiteBundle().catch((error) => {
  console.error('[godot-air-striker-web/toss-package] Failed to prepare web bundle.');
  console.error(error);
  process.exit(1);
});
