import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..', '..', '..');
const GAME_ROOT = path.join(REPO_ROOT, 'games', 'retro-hero-street-beat');
const OUTDIR = path.join(PACKAGE_ROOT, 'dist');

const LEGAL_PAGES = ['about.html', 'contact.html', 'dmca.html', 'privacy.html', 'terms.html'];
const BRIDGE_OUTFILE = path.join(GAME_ROOT, 'toss-bridge.js');

async function ensureParentDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function writeTextFile(sourcePath, destinationPath, transform = (value) => value) {
  await ensureParentDir(destinationPath);
  const contents = await readFile(sourcePath, 'utf8');
  await writeFile(destinationPath, transform(contents), 'utf8');
}

async function copyRawFile(sourcePath, destinationPath) {
  await ensureParentDir(destinationPath);
  await copyFile(sourcePath, destinationPath);
}

function rewriteLegalPage(contents) {
  return contents
    .replaceAll('href="/index.html"', 'href="./index.html"')
    .replaceAll('href="/about.html"', 'href="./about.html"')
    .replaceAll('href="/contact.html"', 'href="./contact.html"')
    .replaceAll('href="/privacy.html"', 'href="./privacy.html"')
    .replaceAll('href="/terms.html"', 'href="./terms.html"')
    .replaceAll('href="/dmca.html"', 'href="./dmca.html"')
    .replaceAll('href="/assets/css/site-quality.css"', 'href="./assets/css/site-quality.css"');
}

async function buildBridge() {
  await esbuild.build({
    entryPoints: [path.join(GAME_ROOT, 'toss-bridge-source.js')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2018'],
    outfile: BRIDGE_OUTFILE,
    legalComments: 'none',
    logLevel: 'silent',
  });
}

async function buildWebBundle() {
  await rm(OUTDIR, { recursive: true, force: true });
  await mkdir(OUTDIR, { recursive: true });

  await buildBridge();

  await writeTextFile(
    path.join(GAME_ROOT, 'index.html'),
    path.join(OUTDIR, 'index.html'),
    (contents) =>
      contents
        .replaceAll('../privacy.html', './privacy.html')
        .replaceAll('../terms.html', './terms.html')
        .replaceAll('../contact.html', './contact.html'),
  );

  await writeTextFile(
    path.join(GAME_ROOT, 'game.js'),
    path.join(OUTDIR, 'game.js'),
    (contents) =>
      contents.replace("new URL('../', window.location.href)", "new URL('./', window.location.href)"),
  );

  await copyRawFile(path.join(GAME_ROOT, 'style.css'), path.join(OUTDIR, 'style.css'));
  await copyRawFile(path.join(BRIDGE_OUTFILE), path.join(OUTDIR, 'toss-bridge.js'));
  await copyRawFile(
    path.join(GAME_ROOT, 'assets', 'audio', 'a-hero-of-the-80s-126684.mp3'),
    path.join(OUTDIR, 'assets', 'audio', 'a-hero-of-the-80s-126684.mp3'),
  );
  await copyRawFile(
    path.join(REPO_ROOT, 'assets', 'css', 'site-quality.css'),
    path.join(OUTDIR, 'assets', 'css', 'site-quality.css'),
  );

  for (const page of LEGAL_PAGES) {
    await writeTextFile(
      path.join(REPO_ROOT, page),
      path.join(OUTDIR, page),
      rewriteLegalPage,
    );
  }
}

buildWebBundle().catch((error) => {
  console.error('[retro-hero-street-beat/toss-package] Failed to prepare web bundle.');
  console.error(error);
  process.exit(1);
});
