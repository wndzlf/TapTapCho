import { spawnSync } from 'node:child_process';
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTDIR = path.join(PACKAGE_ROOT, 'dist');
const PORT = Number(process.env.PORT || 4174);
const BUILD_SCRIPT = path.join(PACKAGE_ROOT, 'scripts', 'build-web.mjs');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

const buildResult = spawnSync(process.execPath, [BUILD_SCRIPT], {
  cwd: PACKAGE_ROOT,
  stdio: 'inherit',
});

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

function resolveFilePath(requestUrl) {
  const requestPath = new URL(requestUrl || '/', 'http://127.0.0.1').pathname;
  const normalizedPath = requestPath === '/' ? '/index.html' : requestPath;
  const resolvedPath = path.resolve(OUTDIR, `.${normalizedPath}`);

  if (!resolvedPath.startsWith(OUTDIR)) {
    return null;
  }

  return resolvedPath;
}

const server = http.createServer(async (request, response) => {
  const filePath = resolveFilePath(request.url);

  if (!filePath) {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }

  try {
    await access(filePath);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || 'application/octet-stream';

  response.writeHead(200, { 'Content-Type': contentType });
  createReadStream(filePath).pipe(response);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Sunken Defense preview server: http://127.0.0.1:${PORT}`);
});
