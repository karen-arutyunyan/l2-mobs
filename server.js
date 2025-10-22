import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8080;

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'monsters_dashboard.html' : req.url);
  
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