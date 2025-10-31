import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8080;
const WHITELIST_FILE = path.join(__dirname, 'data', 'item_whitelist.json');

const server = http.createServer((req, res) => {
  // Handle API endpoints
  if (req.url.startsWith('/api/')) {
    if (req.url === '/api/save-whitelist' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const whitelist = JSON.parse(body);
          fs.writeFileSync(WHITELIST_FILE, JSON.stringify(whitelist, null, 2));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to save whitelist' }));
        }
      });
      return;
    }

    if (req.url === '/api/load-whitelist' && req.method === 'GET') {
      try {
        if (fs.existsSync(WHITELIST_FILE)) {
          const data = fs.readFileSync(WHITELIST_FILE, 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(data);
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({}));
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to load whitelist' }));
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('API endpoint not found');
    return;
  }

  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

  const extname = path.extname(filePath).toLowerCase();
  let contentType = 'text/html';

  switch (extname) {
    case '.json': contentType = 'application/json'; break;
    case '.css': contentType = 'text/css'; break;
    case '.js': contentType = 'text/javascript'; break;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`
  ✓ HTTP сервер запущен
  📊 Откройте браузер: http://localhost:${PORT}
  `);
});
