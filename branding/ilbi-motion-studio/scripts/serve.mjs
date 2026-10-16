import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ttf': 'font/ttf', '.mp4': 'video/mp4', '.md': 'text/plain; charset=utf-8' };

export function createStudioServer(directory = root) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let path = decodeURIComponent(url.pathname);
      if (path.endsWith('/')) path += 'index.html';
      const file = resolve(directory, `.${path}`);
      if (!file.startsWith(resolve(directory) + sep)) { res.writeHead(403).end(); return; }
      const info = await stat(file);
      if (!info.isFile()) { res.writeHead(404).end(); return; }
      const headers = { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' };
      const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
      if (range) {
        const start = Number(range[1]);
        const end = range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
        if (start > end || start >= info.size) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end(); return; }
        res.writeHead(206, { ...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${info.size}` });
        if (req.method === 'HEAD') res.end(); else createReadStream(file, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { ...headers, 'Content-Length': info.size });
        if (req.method === 'HEAD') res.end(); else createReadStream(file).pipe(res);
      }
    } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Fayl topilmadi'); }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 5189);
  const server = createStudioServer();
  server.listen(port, '127.0.0.1', () => console.log(`ILBI Motion Studio: http://localhost:${port}/`));
  server.on('error', e => { console.error(e.message); process.exitCode = 1; });
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit()));
}
