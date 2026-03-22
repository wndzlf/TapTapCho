import { build } from 'esbuild';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_ROOT = path.resolve(PACKAGE_ROOT, '..');
const REPO_ROOT = path.resolve(PROJECT_ROOT, '..', '..');
const OUTDIR = path.join(PACKAGE_ROOT, 'dist');

async function ensureParentDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function copyTextFile(sourcePath, destinationPath, transform = (contents) => contents) {
  await ensureParentDir(destinationPath);
  const contents = await readFile(sourcePath, 'utf8');
  await writeFile(destinationPath, transform(contents), 'utf8');
}

async function copyBinaryFile(sourcePath, destinationPath) {
  await ensureParentDir(destinationPath);
  await copyFile(sourcePath, destinationPath);
}

async function bundleBridge() {
  const sourcePath = path.join(PROJECT_ROOT, 'toss-bridge-source.js');
  const rootBridgePath = path.join(PROJECT_ROOT, 'toss-bridge.js');
  const distBridgePath = path.join(OUTDIR, 'toss-bridge.js');

  await build({
    entryPoints: [sourcePath],
    outfile: rootBridgePath,
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2018'],
    charset: 'utf8',
    minify: false,
    sourcemap: false,
  });

  await copyBinaryFile(rootBridgePath, distBridgePath);
}

async function buildOtterIcecreamPopWebBundle() {
  await rm(OUTDIR, { recursive: true, force: true });
  await mkdir(OUTDIR, { recursive: true });

  await copyTextFile(path.join(PROJECT_ROOT, 'index.html'), path.join(OUTDIR, 'index.html'));
  await copyTextFile(path.join(PROJECT_ROOT, 'style.css'), path.join(OUTDIR, 'style.css'));
  await copyTextFile(path.join(PROJECT_ROOT, 'game.js'), path.join(OUTDIR, 'game.js'));
  await copyTextFile(
    path.join(PROJECT_ROOT, 'assets', 'audio', 'README.md'),
    path.join(OUTDIR, 'assets', 'audio', 'README.md'),
  );

  await bundleBridge();
}

buildOtterIcecreamPopWebBundle().catch((error) => {
  console.error('[otter-icecream-pop/toss-package] Failed to prepare web bundle.');
  console.error(error);
  process.exit(1);
});
