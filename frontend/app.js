const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 3000;
const STATIC_DIR = __dirname;
const API_HOST = 'src.mirvalut.com';
const API_PORT = 443;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.webp': 'image/webp',
};

const server = http.createServer((req, res) => {
    // Proxy API requests to backend via public URL (Passenger container isolation workaround)
    if (req.url.startsWith('/api/') || req.url.startsWith('/static/')) {
        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: req.url,
            method: req.method,
            headers: { ...req.headers, host: API_HOST },
        };

        const proxy = https.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });

        proxy.on('error', (err) => {
            console.error('Proxy Error:', err);
            res.writeHead(502);
            res.end('Backend unavailable');
        });

        req.pipe(proxy);
        return;
    }

    // Serve static files (SPA)
    let filePath = path.join(STATIC_DIR, req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err || !ext) {
            // SPA fallback — serve index.html for all routes
            filePath = path.join(STATIC_DIR, 'index.html');
        }

        fs.readFile(filePath, (readErr, data) => {
            if (readErr) {
                res.writeHead(500);
                res.end('Server Error');
                return;
            }

            const mimeType = MIME_TYPES[path.extname(filePath)] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(data);
        });
    });
});

server.listen(PORT, HOST, () => {
    console.log(`Svit Valut frontend running on ${HOST}:${PORT}`);
});
