const http = require('http');

const PORT = process.env.MOCK_PORT || 8787;

const store = {};

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/supabase/functions/account-verification/send') {
      const body = await readJson(req);
      const { userId, method, destination } = body;
      if (!userId || !method || !destination) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'missing' }));
        return;
      }
      const code = (Math.floor(100000 + Math.random() * 900000)).toString();
      store[userId] = { code, method, destination, createdAt: Date.now() };
      console.log('mock: stored code for', userId, code);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, dev_code: code }));
      return;
    }

    if (req.method === 'POST' && req.url === '/supabase/functions/account-verification/verify') {
      const body = await readJson(req);
      const { userId, code } = body;
      if (!userId || !code) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'missing' }));
        return;
      }
      const row = store[userId];
      if (!row) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, reason: 'not_found' }));
        return;
      }
      if (row.code === code) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, reason: 'invalid' }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
  } catch (err) {
    console.error('mock server error', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: String(err) }));
  }
});

server.listen(PORT, () => console.log(`Mock account-verification server listening on http://localhost:${PORT}`));

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
