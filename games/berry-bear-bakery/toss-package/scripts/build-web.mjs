import { build } from 'esbuild';
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAME_ROOT = path.resolve(PACKAGE_ROOT, '..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..', '..', '..');
const OUTDIR = path.join(PACKAGE_ROOT, 'dist');
const AUDIO_DIR = path.join(GAME_ROOT, 'assets', 'audio');

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

async function bundleBridge() {
  await build({
    entryPoints: [path.join(GAME_ROOT, 'toss-bridge-source.js')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2018',
    outfile: path.join(GAME_ROOT, 'toss-bridge.js'),
    sourcemap: false,
    minify: false,
    logLevel: 'silent',
  });
}

async function copyAudioAssets() {
  try {
    const entries = await readdir(AUDIO_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      await copyRawFile(path.join(AUDIO_DIR, entry.name), path.join(OUTDIR, 'assets', 'audio', entry.name));
    }
  } catch (error) {
    // Audio is optional.
  }
}

async function buildBerryBearBakeryWebBundle() {
  await bundleBridge();

  await rm(OUTDIR, { recursive: true, force: true });
  await mkdir(OUTDIR, { recursive: true });

  await copyRawFile(path.join(GAME_ROOT, 'index.html'), path.join(OUTDIR, 'index.html'));
  await copyRawFile(path.join(GAME_ROOT, 'style.css'), path.join(OUTDIR, 'style.css'));
  await copyRawFile(path.join(GAME_ROOT, 'game.js'), path.join(OUTDIR, 'game.js'));
  await copyRawFile(path.join(GAME_ROOT, 'toss-bridge.js'), path.join(OUTDIR, 'toss-bridge.js'));

  await copyAudioAssets();

  await copyRawFile(path.join(GAME_ROOT, 'assets', 'audio', 'README.md'), path.join(OUTDIR, 'assets', 'audio', 'README.md'));
}

buildBerryBearBakeryWebBundle().catch((error) => {
  console.error('[berry-bear-bakery/toss-package] Failed to prepare web bundle.');
  console.error(error);
  process.exit(1);
});
