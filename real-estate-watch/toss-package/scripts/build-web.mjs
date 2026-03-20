import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_ROOT = path.resolve(PACKAGE_ROOT, '..');
const OUTDIR = path.join(PACKAGE_ROOT, 'dist');
const DEFAULT_INLINE_AD_GROUP_ID = 'ait-ad-test-native-image-id';
const INLINE_AD_GROUP_ID = process.env.TOSS_INLINE_AD_GROUP_ID?.trim() || DEFAULT_INLINE_AD_GROUP_ID;

const FILES_TO_COPY = [
  'index.html',
  'deals/index.html',
  'styles.css',
  'app.js',
  'toss-bridge.js',
  'latest-transactions.json',
];

async function ensureParentDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function copyRawFile(sourcePath, destinationPath) {
  await ensureParentDir(destinationPath);
  await copyFile(sourcePath, destinationPath);
}

async function copyIndexHtml(sourcePath, destinationPath) {
  await ensureParentDir(destinationPath);
  const source = await readFile(sourcePath, 'utf8');
  await writeFile(
    destinationPath,
    source.replace(DEFAULT_INLINE_AD_GROUP_ID, INLINE_AD_GROUP_ID),
    'utf8'
  );
}

async function buildRealEstateWatchWebBundle() {
  await rm(OUTDIR, { recursive: true, force: true });
  await mkdir(OUTDIR, { recursive: true });

  for (const file of FILES_TO_COPY) {
    const sourcePath = path.join(APP_ROOT, file);
    const destinationPath = path.join(OUTDIR, file);

    if (file === 'index.html') {
      await copyIndexHtml(sourcePath, destinationPath);
      continue;
    }

    await copyRawFile(sourcePath, destinationPath);
  }
}

buildRealEstateWatchWebBundle().catch((error) => {
  console.error('[real-estate-watch/toss-package] Failed to prepare web bundle.');
  console.error(error);
  process.exit(1);
});
