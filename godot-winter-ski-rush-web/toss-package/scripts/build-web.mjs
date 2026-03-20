import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..', '..');
const SOURCE_ROOT = path.join(REPO_ROOT, 'godot-winter-ski-rush-web');
const OUTDIR = path.join(PACKAGE_ROOT, 'dist');

const LEGAL_PAGES = ['about.html', 'contact.html', 'dmca.html', 'privacy.html', 'terms.html'];
const RAW_FILES = [
  'index.js',
  'index.pck',
  'index.wasm',
  'index.png',
  'index.icon.png',
  'index.apple-touch-icon.png',
  'index.audio.worklet.js',
  'index.audio.position.worklet.js',
  'style.css',
  'toss-bridge.js',
];

const EXTRA_COPIES = [
  {
    source: path.join(REPO_ROOT, 'assets', 'css', 'site-quality.css'),
    destination: path.join(OUTDIR, 'assets', 'css', 'site-quality.css'),
  },
];

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

function rewriteIndex(contents) {
  return contents
    .replaceAll('../privacy.html', './privacy.html')
    .replaceAll('../terms.html', './terms.html')
    .replaceAll('../contact.html', './contact.html');
}

function rewriteRuntime(contents) {
  return contents.replace(
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

async function buildWinterSkiRushWebBundle() {
  await rm(OUTDIR, { recursive: true, force: true });
  await mkdir(OUTDIR, { recursive: true });

  await writeTransformedFile(
    path.join(SOURCE_ROOT, 'index.html'),
    path.join(OUTDIR, 'index.html'),
    rewriteIndex,
  );

  await writeTransformedFile(
    path.join(SOURCE_ROOT, 'toss-runtime.js'),
    path.join(OUTDIR, 'toss-runtime.js'),
    rewriteRuntime,
  );

  for (const file of RAW_FILES) {
    await copyRawFile(path.join(SOURCE_ROOT, file), path.join(OUTDIR, file));
  }

  for (const file of EXTRA_COPIES) {
    await copyRawFile(file.source, file.destination);
  }

  for (const page of LEGAL_PAGES) {
    await writeTransformedFile(
      path.join(REPO_ROOT, page),
      path.join(OUTDIR, page),
      rewriteLegalPage,
    );
  }
}

buildWinterSkiRushWebBundle().catch((error) => {
  console.error('[godot-winter-ski-rush-web/toss-package] Failed to prepare web bundle.');
  console.error(error);
  process.exit(1);
});
