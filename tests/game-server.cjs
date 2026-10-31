const fs = require('fs');
const http = require('http');
const path = require('path');

const defaultPublicRoot = path.resolve(__dirname, '../_site');
const contentTypes = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
});

function createGameServer({ htmlPath = path.resolve(__dirname, '../index.html'), publicRoot = defaultPublicRoot } = {}) {
  publicRoot = path.resolve(publicRoot);
  return http.createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); }
    catch { res.writeHead(400).end('Bad request'); return; }
    if (/^\/(?:favicon|apple-touch-icon)(?:-[^/]*)?\.(?:ico|png|svg)$/i.test(pathname)) {
      res.writeHead(204).end();
      return;
    }
    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': contentTypes['.html'] });
      res.end(fs.readFileSync(htmlPath));
      return;
    }
    const file = path.resolve(publicRoot, '.' + pathname);
    if (!file.startsWith(publicRoot + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end('Not found');
      return;
    }
    const extension = path.extname(file);
    res.writeHead(200, { 'Content-Type': contentTypes[extension] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
}

module.exports = { createGameServer };

