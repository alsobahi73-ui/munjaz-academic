import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { Script, createContext } from 'node:vm';
import { createRequestHandler, corsDiagnostics, normalizeOrigin } from './telegram-requests.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const context = createContext({ window: {} });
new Script(await readFile(resolve(root, 'academic-services-data.js'), 'utf8')).runInContext(context);
const handle = createRequestHandler({
  catalog: context.window.AcademicServicesCatalog,
  token: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID,
  siteOrigin: process.env.SITE_ORIGIN,
});
// Serve only public application files. Source, secrets, Git metadata and environment files are inaccessible.
const publicFiles = new Map([
  ['/news.json', ['news.json', 'application/json']],
  ['/scripts/news-feed.js', ['scripts/news-feed.js', 'text/javascript']],
  ['/', ['index.html', 'text/html']], ['/index.html', ['index.html', 'text/html']],
  ['/services.html', ['services.html', 'text/html']], ['/styles.css', ['styles.css', 'text/css']],
  ['/app.js', ['app.js', 'text/javascript']], ['/academic-services.css', ['academic-services.css', 'text/css']],
  ['/academic-services.js', ['academic-services.js', 'text/javascript']],
  ['/academic-services-data.js', ['academic-services-data.js', 'text/javascript']],
  ['/academic-services-config.js', ['academic-services-config.js', 'text/javascript']],
]);
const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/debug-cors' && req.method === 'GET') {
      const diagnostics = corsDiagnostics(req.headers.origin ?? null, process.env.SITE_ORIGIN);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
        ...(diagnostics.match ? { 'Access-Control-Allow-Origin': normalizeOrigin(req.headers.origin), 'Vary': 'Origin' } : {}),
      });
      res.end(JSON.stringify(diagnostics));
      return;
    }
    if (pathname === '/api/academic-requests') {
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 12000) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid_request' }));
          return;
        }
        chunks.push(chunk);
      }
      const request = new Request('http://localhost/api/academic-requests', {
        method: req.method, headers: req.headers,
        ...(!['GET', 'HEAD'].includes(req.method) ? { body: Buffer.concat(chunks) } : {}),
      });
      const response = await handle(request, req.socket.remoteAddress);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
      return;
    }
    if (pathname === '/healthz' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}'); return;
    }
    const file = publicFiles.get(pathname);
    if (!file || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); res.end(); return; }
    const data = await readFile(resolve(root, file[0]));
    res.writeHead(200, { 'Content-Type': file[1] + '; charset=utf-8' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(500); res.end('Internal server error'); }
});
server.listen(Number(process.env.PORT || 3000), process.env.BIND_ADDRESS || '127.0.0.1', () => {
  console.log('Munjiz Academic server is ready.');
});
