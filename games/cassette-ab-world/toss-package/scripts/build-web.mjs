import { build } from 'esbuild';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..', '..', '..');
const GAME_ROOT = path.join(REPO_ROOT, 'games', 'cassette-ab-world');
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

async function copyRawFile(sourcePath, destinationPath) {
  await ensureParentDir(destinationPath);
  await copyFile(sourcePath, destinationPath);
}

async function writeTransformedFile(sourcePath, destinationPath, transform) {
  await ensureParentDir(destinationPath);
  const contents = await readFile(sourcePath, 'utf8');
  await writeFile(destinationPath, transform(contents), 'utf8');
}

function rewriteLegalPage(contents) {
  let rewritten = contents;
  for (const [from, to] of LINK_REWRITES) {
    rewritten = rewritten.replaceAll(from, to);
  }
  return rewritten;
}

async function bundleBridge() {
  await build({
    entryPoints: [path.join(GAME_ROOT, 'toss-bridge-source.js')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2019'],
    outfile: path.join(GAME_ROOT, 'toss-bridge.js'),
  });
}

async function buildWebBundle() {
  await bundleBridge();
  await rm(OUTDIR, { recursive: true, force: true });
  await mkdir(OUTDIR, { recursive: true });

  await writeTransformedFile(
    path.join(GAME_ROOT, 'index.html'),
    path.join(OUTDIR, 'index.html'),
    (contents) =>
      contents
        .replaceAll('../privacy.html', './privacy.html')
        .replaceAll('../terms.html', './terms.html')
        .replaceAll('../contact.html', './contact.html'),
  );
  await writeTransformedFile(
    path.join(GAME_ROOT, 'game.js'),
    path.join(OUTDIR, 'game.js'),
    (contents) =>
      contents.replace("new URL('../', window.location.href)", "new URL('./', window.location.href)"),
  );
  await copyRawFile(path.join(GAME_ROOT, 'style.css'), path.join(OUTDIR, 'style.css'));
  await copyRawFile(path.join(GAME_ROOT, 'toss-bridge.js'), path.join(OUTDIR, 'toss-bridge.js'));
  await copyRawFile(
    path.join(GAME_ROOT, 'assets', 'audio', 'on-the-road-to-the-eighties-59sec-177566.mp3'),
    path.join(OUTDIR, 'assets', 'audio', 'on-the-road-to-the-eighties-59sec-177566.mp3'),
  );
  await copyRawFile(
    path.join(REPO_ROOT, 'assets', 'css', 'site-quality.css'),
    path.join(OUTDIR, 'assets', 'css', 'site-quality.css'),
  );

  for (const page of LEGAL_PAGES) {
    await writeTransformedFile(
      path.join(REPO_ROOT, page),
      path.join(OUTDIR, page),
      rewriteLegalPage,
    );
  }
}

buildWebBundle().catch((error) => {
  console.error('[cassette-ab-world/toss-package] Failed to prepare web bundle.');
  console.error(error);
  process.exit(1);
});
