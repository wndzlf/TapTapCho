import { build } from 'esbuild';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..', '..', '..');
const GAME_ROOT = path.join(REPO_ROOT, 'games', 'momo-macaron-rush');
const OUTDIR = path.join(PACKAGE_ROOT, 'dist');

const LEGAL_PAGES = ['about.html', 'contact.html', 'dmca.html', 'privacy.html', 'terms.html'];

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

  await copyRawFile(path.join(GAME_ROOT, 'index.html'), path.join(OUTDIR, 'index.html'));
  await copyRawFile(path.join(GAME_ROOT, 'game.js'), path.join(OUTDIR, 'game.js'));
  await copyRawFile(path.join(GAME_ROOT, 'style.css'), path.join(OUTDIR, 'style.css'));
  await copyRawFile(path.join(GAME_ROOT, 'toss-bridge.js'), path.join(OUTDIR, 'toss-bridge.js'));
  await copyRawFile(path.join(GAME_ROOT, 'assets', 'audio', 'README.md'), path.join(OUTDIR, 'assets', 'audio', 'README.md'));

  for (const page of LEGAL_PAGES) {
    const sourcePath = path.join(REPO_ROOT, page);
    const destinationPath = path.join(OUTDIR, page);
    await writeTransformedFile(
      sourcePath,
      destinationPath,
      (contents) =>
        contents
          .replaceAll('../privacy.html', './privacy.html')
          .replaceAll('../terms.html', './terms.html')
          .replaceAll('../contact.html', './contact.html'),
    );
  }
}

buildWebBundle().catch((error) => {
  console.error('[momo-macaron-rush/toss-package] Failed to prepare web bundle.');
  console.error(error);
  process.exit(1);
});
