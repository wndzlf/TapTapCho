import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..', '..', '..');
const OUTDIR = path.join(PACKAGE_ROOT, 'dist');

const SOURCE_ROOT = path.join(REPO_ROOT, 'games', 'tokki-pudding-bar');
const BRIDGE_OUTFILE = path.join(SOURCE_ROOT, 'toss-bridge.js');

async function ensureParentDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function copyRawFile(sourcePath, destinationPath) {
  await ensureParentDir(destinationPath);
  await copyFile(sourcePath, destinationPath);
}

async function writeTextFile(sourcePath, destinationPath, transform = (value) => value) {
  await ensureParentDir(destinationPath);
  const contents = await readFile(sourcePath, 'utf8');
  await writeFile(destinationPath, transform(contents), 'utf8');
}

async function buildBridge() {
  await esbuild.build({
    entryPoints: [path.join(SOURCE_ROOT, 'toss-bridge-source.js')],
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

  await writeTextFile(path.join(SOURCE_ROOT, 'index.html'), path.join(OUTDIR, 'index.html'));
  await copyRawFile(path.join(SOURCE_ROOT, 'style.css'), path.join(OUTDIR, 'style.css'));
  await copyRawFile(path.join(SOURCE_ROOT, 'game.js'), path.join(OUTDIR, 'game.js'));
  await buildBridge();
  await copyRawFile(BRIDGE_OUTFILE, path.join(OUTDIR, 'toss-bridge.js'));
}

buildWebBundle().catch((error) => {
  console.error('[tokki-pudding-bar/toss-package] Failed to prepare web bundle.');
  console.error(error);
  process.exit(1);
});
