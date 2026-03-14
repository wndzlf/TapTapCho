const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const HUB_PORT = Number(process.env.MULTI_HUB_PORT || 9090);
const HUB_HOST = process.env.MULTI_HUB_HOST || '0.0.0.0';
const SUNKEN_PORT = Number(process.env.SUNKEN_INTERNAL_PORT || 19091);
const TWIN_PORT = Number(process.env.TWIN_INTERNAL_PORT || 19092);

const ROOT_DIR = path.join(__dirname, '..');
const SUNKEN_SCRIPT = path.join(__dirname, 'sunken-multi-server.js');
const TWIN_SCRIPT = path.join(__dirname, 'twin-temple-multi-server.js');

const managed = {
  sunken: { name: 'sunken', script: SUNKEN_SCRIPT, port: SUNKEN_PORT, envPortKey: 'SUNKEN_MULTI_PORT', child: null, restarts: 0, lastExit: null },
  twin: { name: 'twin', script: TWIN_SCRIPT, port: TWIN_PORT, envPortKey: 'TWIN_TEMPLE_PORT', child: null, restarts: 0, lastExit: null },
};

let shuttingDown = false;

function pipeLogs(name, child) {
  if (child.stdout) {
    child.stdout.on('data', (chunk) => {
      process.stdout.write(`[${name}] ${chunk}`);
    });
  }
  if (child.stderr) {
    child.stderr.on('data', (chunk) => {
      process.stderr.write(`[${name}] ${chunk}`);
    });
  }
}

function spawnService(state) {
  if (shuttingDown) return;
  const env = {
    ...process.env,
    [state.envPortKey]: String(state.port),
  };
  const child = spawn(process.execPath, [state.script], {
    cwd: ROOT_DIR,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  state.child = child;
  pipeLogs(state.name, child);

  child.on('exit', (code, signal) => {
    state.lastExit = { code, signal, at: new Date().toISOString() };
    state.child = null;
    if (shuttingDown) return;
    state.restarts += 1;
    setTimeout(() => spawnService(state), 900);
  });
}

function childAlive(state) {
  return Boolean(state.child && !state.child.killed);
}

function parsePath(reqUrl) {
  try {
    return new URL(reqUrl || '/', 'http://localhost').pathname || '/';
  } catch (_) {
    return '/';
  }
}

function resolveWsTarget(reqUrl) {
  const pathname = parsePath(reqUrl);
  if (pathname === '/ws/twin') {
    return { service: 'twin', port: TWIN_PORT };
  }
  if (pathname === '/ws/sunken' || pathname === '/' || pathname === '/ws') {
    return { service: 'sunken', port: SUNKEN_PORT };
  }
  return null;
}

function proxyHealth(port, targetPath, res) {
  const request = http.request(
    {
      hostname: '127.0.0.1',
      port,
      path: targetPath,
      method: 'GET',
      timeout: 1600,
    },
    (upstream) => {
      let body = '';
      upstream.setEncoding('utf8');
      upstream.on('data', (chunk) => {
        body += chunk;
      });
      upstream.on('end', () => {
        res.statusCode = upstream.statusCode || 200;
        res.setHeader('Content-Type', upstream.headers['content-type'] || 'application/json; charset=utf-8');
        res.end(body || '{}');
      });
    }
  );
  request.on('timeout', () => {
    request.destroy(new Error('timeout'));
  });
  request.on('error', (error) => {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        ok: false,
        error: String(error.message || error),
        targetPort: port,
        targetPath,
      })
    );
  });
  request.end();
}

const server = http.createServer((req, res) => {
  const pathname = parsePath(req.url);

  if (pathname === '/health/sunken') {
    proxyHealth(SUNKEN_PORT, '/', res);
    return;
  }

  if (pathname === '/health/twin') {
    proxyHealth(TWIN_PORT, '/health', res);
    return;
  }

  if (pathname === '/health' || pathname === '/') {
    const payload = {
      ok: true,
      service: 'taptap-multi-hub-server',
      port: HUB_PORT,
      routes: {
        sunkenWebSocket: '/ws/sunken',
        twinWebSocket: '/ws/twin',
        sunkenHealth: '/health/sunken',
        twinHealth: '/health/twin',
      },
      children: {
        sunken: {
          port: SUNKEN_PORT,
          alive: childAlive(managed.sunken),
          pid: managed.sunken.child ? managed.sunken.child.pid : null,
          restarts: managed.sunken.restarts,
          lastExit: managed.sunken.lastExit,
        },
        twin: {
          port: TWIN_PORT,
          alive: childAlive(managed.twin),
          pid: managed.twin.child ? managed.twin.child.pid : null,
          restarts: managed.twin.restarts,
          lastExit: managed.twin.lastExit,
        },
      },
      now: new Date().toISOString(),
    };
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok: false, message: 'Not found' }));
});

const downstreamWss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  downstreamWss.handleUpgrade(req, socket, head, (client) => {
    downstreamWss.emit('connection', client, req);
  });
});

downstreamWss.on('connection', (client, req) => {
  const target = resolveWsTarget(req.url);
  if (!target) {
    client.close(1008, 'Unknown route');
    return;
  }

  const upstream = new WebSocket(`ws://127.0.0.1:${target.port}`);
  let upstreamOpen = false;
  const pending = [];

  client.on('message', (data, isBinary) => {
    if (upstreamOpen && upstream.readyState === WebSocket.OPEN) {
      upstream.send(data, { binary: isBinary });
      return;
    }
    pending.push([data, isBinary]);
  });

  client.on('close', () => {
    if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) {
      upstream.close();
    }
  });

  client.on('error', () => {
    if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) {
      upstream.terminate();
    }
  });

  upstream.on('open', () => {
    upstreamOpen = true;
    while (pending.length > 0 && upstream.readyState === WebSocket.OPEN) {
      const [data, isBinary] = pending.shift();
      upstream.send(data, { binary: isBinary });
    }
  });

  upstream.on('message', (data, isBinary) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data, { binary: isBinary });
    }
  });

  upstream.on('close', (code, reason) => {
    if (client.readyState === WebSocket.OPEN) {
      const text = reason ? String(reason).slice(0, 120) : '';
      client.close(code || 1000, text);
    }
  });

  upstream.on('error', () => {
    if (client.readyState === WebSocket.OPEN) {
      client.close(1011, 'Upstream error');
    }
  });
});

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[taptap-multi-hub-server] ${signal} received, shutting down...`);

  for (const key of Object.keys(managed)) {
    const child = managed[key].child;
    if (!child || child.killed) continue;
    try {
      child.kill('SIGTERM');
    } catch (_) {
      // ignore
    }
  }

  for (const client of downstreamWss.clients) {
    try {
      client.close();
    } catch (_) {
      // ignore
    }
  }

  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 900).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

spawnService(managed.sunken);
spawnService(managed.twin);

server.listen(HUB_PORT, HUB_HOST, () => {
  console.log(`[taptap-multi-hub-server] listening on ${HUB_HOST}:${HUB_PORT}`);
  console.log(`[taptap-multi-hub-server] sunken ws: /ws/sunken -> 127.0.0.1:${SUNKEN_PORT}`);
  console.log(`[taptap-multi-hub-server] twin   ws: /ws/twin   -> 127.0.0.1:${TWIN_PORT}`);
});
