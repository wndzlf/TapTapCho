import { build } from 'esbuild';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAME_ROOT = path.resolve(PACKAGE_ROOT, '..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..', '..', '..');
const OUTDIR = path.join(PACKAGE_ROOT, 'dist');
const BRIDGE_SOURCE = path.join(GAME_ROOT, 'toss-bridge-source.js');
const BRIDGE_OUTPUT = path.join(GAME_ROOT, 'toss-bridge.js');

const AUDIO_FILES = [
  'hamjji-boba-shop-start.mp3',
  'hamjji-boba-shop-tap.mp3',
  'hamjji-boba-shop-success.mp3',
  'hamjji-boba-shop-miss.mp3',
  'hamjji-boba-shop-timeout.mp3',
];

async function ensureParentDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function copyTextFile(sourcePath, destinationPath) {
  await ensureParentDir(destinationPath);
  const contents = await readFile(sourcePath, 'utf8');
  await writeFile(destinationPath, contents, 'utf8');
}

async function copyBinaryFile(sourcePath, destinationPath) {
  await ensureParentDir(destinationPath);
  await copyFile(sourcePath, destinationPath);
}

async function buildBridge() {
  await build({
    entryPoints: [BRIDGE_SOURCE],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    outfile: BRIDGE_OUTPUT,
    logLevel: 'silent',
  });
}

async function copyOptionalAudio(filename) {
  const destinationPath = path.join(OUTDIR, 'assets', 'audio', filename);
  const candidates = [
    path.join(GAME_ROOT, 'assets', 'audio', filename),
    path.join(REPO_ROOT, 'static', 'sounds', filename),
  ];

  for (const sourcePath of candidates) {
    try {
      await copyBinaryFile(sourcePath, destinationPath);
      return;
    } catch (error) {
      // Try the next candidate.
    }
  }

  console.warn(`[hamjji-boba-shop/toss-package] Optional audio asset not found: ${filename}`);
}

async function buildWebBundle() {
  await buildBridge();

  await rm(OUTDIR, { recursive: true, force: true });
  await mkdir(OUTDIR, { recursive: true });

  await copyTextFile(path.join(GAME_ROOT, 'index.html'), path.join(OUTDIR, 'index.html'));
  await copyTextFile(path.join(GAME_ROOT, 'game.js'), path.join(OUTDIR, 'game.js'));
  await copyTextFile(path.join(GAME_ROOT, 'style.css'), path.join(OUTDIR, 'style.css'));
  await copyTextFile(BRIDGE_OUTPUT, path.join(OUTDIR, 'toss-bridge.js'));
  await copyTextFile(path.join(GAME_ROOT, 'assets', 'audio', 'README.md'), path.join(OUTDIR, 'assets', 'audio', 'README.md'));

  for (const filename of AUDIO_FILES) {
    await copyOptionalAudio(filename);
  }
}

buildWebBundle().catch((error) => {
  console.error('[hamjji-boba-shop/toss-package] Failed to prepare web bundle.');
  console.error(error);
  process.exit(1);
});
