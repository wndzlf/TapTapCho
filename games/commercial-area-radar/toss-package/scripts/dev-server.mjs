import { spawnSync } from 'node:child_process';
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTDIR = path.join(PACKAGE_ROOT, 'dist');
const PORT = Number(process.env.PORT || 4177);
const BUILD_SCRIPT = path.join(PACKAGE_ROOT, 'scripts', 'build-web.mjs');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const buildResult = spawnSync(process.execPath, [BUILD_SCRIPT], {
  cwd: PACKAGE_ROOT,
  stdio: 'inherit',
});

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

async function resolveFilePath(requestUrl) {
  const requestPath = new URL(requestUrl || '/', 'http://127.0.0.1').pathname;
  const normalizedPath = requestPath === '/' ? '/index.html' : requestPath;
  const candidates = [normalizedPath];

  if (!path.extname(normalizedPath)) {
    candidates.push(path.posix.join(normalizedPath, 'index.html'));
  }

  for (const candidate of candidates) {
    const resolvedPath = path.resolve(OUTDIR, `.${candidate}`);

    if (!resolvedPath.startsWith(OUTDIR)) {
      return null;
    }

    try {
      const fileStat = await stat(resolvedPath);
      if (fileStat.isFile()) {
        return resolvedPath;
      }
    } catch {
      // Try the next candidate path.
    }
  }

  return null;
}

const server = http.createServer(async (request, response) => {
  const filePath = await resolveFilePath(request.url);

  if (!filePath) {
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
  console.log(`Commercial Area Radar preview server: http://127.0.0.1:${PORT}`);
});
