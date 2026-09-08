// 凑一队 MVP 服务：Node 内置 http，零外部依赖
const http = require('http');
const fs = require('fs');
const path = require('path');
const { generatePlan, matchGroup } = require('./engine');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = http.createServer((req, res) => {
  // API：对话式行程生成
  if (req.method === 'POST' && req.url === '/api/plan') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { text, hotel } = JSON.parse(body || '{}');
        const plan = generatePlan(text || '', { hotel });
        res.writeHead(200, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify(plan));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ ok: false, message: '输入解析失败：' + e.message }));
      }
    });
    return;
  }

  // API：匹配组队引擎（阶段 2）
  if (req.method === 'POST' && req.url === '/api/match') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { city, profile, hotel, salt } = JSON.parse(body || '{}');
        const result = matchGroup(city || '', profile || {}, { hotel, salt });
        res.writeHead(200, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ ok: false, message: '匹配失败：' + e.message }));
      }
    });
    return;
  }

  // 静态托管
  let urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.join(PUBLIC, urlPath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`🌱 凑一队 MVP 已启动：http://localhost:${PORT}`);
});
