/**
 * Serves dist/ locally under the configured base path, the way GitHub Pages
 * would, so the installable web app can be tried before publishing.
 * Usage: WEB_BASE_URL=/pocket-ledger node scripts/serve-web.js [port]
 */
const fs = require('fs');
const http = require('http');
const path = require('path');

const dist = path.resolve(__dirname, '..', 'dist');
const base = (process.env.WEB_BASE_URL || '').replace(/\/+$/, '');
const port = Number(process.argv[2] || 8080);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.ics': 'text/calendar; charset=utf-8',
};

http
  .createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
    if (base && pathname === '/') {
      res.writeHead(302, { Location: `${base}/` });
      return res.end();
    }
    if (!pathname.startsWith(`${base}/`)) {
      res.writeHead(404);
      return res.end('Not found');
    }
    let file = path.join(dist, pathname.slice(base.length));
    if (!file.startsWith(dist)) {
      res.writeHead(403);
      return res.end();
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, 'index.html');
    let status = 200;
    if (!fs.existsSync(file)) {
      file = path.join(dist, '404.html');
      status = 404;
    }
    res.writeHead(status, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`Serving dist at http://localhost:${port}${base}/`));
