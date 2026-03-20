import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_ROOT = path.resolve(PACKAGE_ROOT, '..');
const OUTDIR = path.join(PACKAGE_ROOT, 'dist');

const FILES_TO_COPY = [
  'index.html',
  'styles.css',
  'app.js',
  'latest-commercial-area-snapshot.json',
];

async function ensureParentDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function copyRawFile(sourcePath, destinationPath) {
  await ensureParentDir(destinationPath);
  await copyFile(sourcePath, destinationPath);
}

async function buildCommercialAreaRadarWebBundle() {
  await rm(OUTDIR, { recursive: true, force: true });
  await mkdir(OUTDIR, { recursive: true });

  for (const file of FILES_TO_COPY) {
    await copyRawFile(path.join(APP_ROOT, file), path.join(OUTDIR, file));
  }
}

buildCommercialAreaRadarWebBundle().catch((error) => {
  console.error('[commercial-area-radar/toss-package] Failed to prepare web bundle.');
  console.error(error);
  process.exit(1);
});
