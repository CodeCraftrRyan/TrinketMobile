/* global Buffer */
// Simple HTTP worker for Render
// Listens on process.env.PORT (default 8080)
const http = require('http');
const { URL } = require('url');
const PORT = process.env.PORT || 8080;

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  // Simple task endpoint: POST /task with JSON body { "name": "..." }
  if (req.method === 'POST' && url.pathname === '/task') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = body ? JSON.parse(body) : {};
        // simulate work (non-blocking)
        const taskName = data.name || 'unnamed';
        console.log(`Received task: ${taskName}`);
        // Example: do asynchronous work here
        await new Promise((r) => setTimeout(r, 200));
        sendJson(res, 200, { status: 'done', task: taskName });
      } catch (err) {
        console.error('Failed to handle /task', err);
        sendJson(res, 400, { error: 'invalid_json' });
      }
    });
    return;
  }

  // Default route
  sendJson(res, 200, { message: 'Render worker running', pid: process.pid });
});

server.listen(PORT, () => {
  console.log(`Worker listening on port ${PORT}`);
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`Received ${signal}, shutting down...`);
  server.close(() => {
    console.log('Server closed. Exiting.');
    process.exit(0);
  });
  // Force exit after 5s
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
