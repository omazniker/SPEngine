const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname);

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const filePath = path.join(dir, url);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + filePath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json' };
    res.writeHead(200, { 'Content-Type': (types[ext] || 'application/octet-stream') + '; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(data);
  });
}).listen(8765, () => console.log('Server on http://localhost:8765'));
