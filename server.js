const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Renderの環境変数からSupabaseの設定を取得
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
};

const server = http.createServer(async (req, res) => {
  // API: Supabaseからデータの読み込み・保存
  if (req.url === '/api/data') {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Supabaseの環境変数が設定されていません' }));
    }

    const supabaseHeaders = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    };

    // データ取得 (GET)
    if (req.method === 'GET') {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/app_data?id=eq.1&select=content`, {
          headers: supabaseHeaders
        });
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0 && data[0].content) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify(data[0].content));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ items: {}, history: [] }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'DB取得失敗' }));
      }
    }

    // データ保存 (POST)
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const contentJson = JSON.parse(body);
          
          const response = await fetch(`${SUPABASE_URL}/rest/v1/app_data`, {
            method: 'POST',
            headers: {
              ...supabaseHeaders,
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({ id: 1, content: contentJson })
          });

          if (response.ok) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } else {
            throw new Error('Supabase save failed');
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '保存失敗' }));
        }
      });
      return;
    }
  }

  // 静的ファイル（HTMLなど）の配信
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});