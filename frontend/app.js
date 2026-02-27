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

// Known static SPA routes (no trailing slashes)
const KNOWN_STATIC_ROUTES = new Set([
    '/',
    '/rates',
    '/contacts',
    '/faq',
    '/login',
    '/panel',
    '/admin',
    '/operator',
]);

// Dynamic valid paths fetched from the backend (SEO URLs, currency info URLs, service URLs, etc.)
let validDynamicPaths = new Set();

function fetchValidPaths() {
    const fetchJSON = (apiPath) => new Promise((resolve, reject) => {
        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: apiPath,
            method: 'GET',
            headers: { 'Accept': 'application/json', 'Host': API_HOST },
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
    });

    Promise.allSettled([
        fetchJSON('/api/seo/'),
        fetchJSON('/api/settings'),
        fetchJSON('/api/currencies/info'),
        fetchJSON('/api/services'),
    ]).then(([seoResult, settingsResult, currInfoResult, servicesResult]) => {
        const paths = new Set();

        // SEO paths
        if (seoResult.status === 'fulfilled' && Array.isArray(seoResult.value)) {
            seoResult.value.forEach(item => {
                if (item.url_path) {
                    let p = item.url_path.startsWith('/') ? item.url_path : '/' + item.url_path;
                    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
                    paths.add(decodeURIComponent(p));
                }
            });
        }

        // Settings-based custom URLs
        if (settingsResult.status === 'fulfilled' && settingsResult.value) {
            const s = settingsResult.value;
            ['contacts_url', 'faq_url', 'rates_url'].forEach(key => {
                if (s[key]) {
                    let p = s[key].startsWith('/') ? s[key] : '/' + s[key];
                    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
                    paths.add(decodeURIComponent(p));
                }
            });
        }

        // Currency info URLs (buy/sell pages)
        if (currInfoResult.status === 'fulfilled' && currInfoResult.value) {
            const info = currInfoResult.value;
            Object.values(info).forEach(ci => {
                if (ci.buy_url) {
                    let p = ci.buy_url.startsWith('/') ? ci.buy_url : '/' + ci.buy_url;
                    paths.add(decodeURIComponent(p));
                }
                if (ci.sell_url) {
                    let p = ci.sell_url.startsWith('/') ? ci.sell_url : '/' + ci.sell_url;
                    paths.add(decodeURIComponent(p));
                }
            });
        }

        // Service link URLs
        if (servicesResult.status === 'fulfilled' && Array.isArray(servicesResult.value)) {
            servicesResult.value.forEach(svc => {
                if (svc.link_url) {
                    let p = svc.link_url.startsWith('/') ? svc.link_url : '/' + svc.link_url;
                    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
                    paths.add(decodeURIComponent(p));
                }
            });
        }

        validDynamicPaths = paths;
        console.log(`[Routes] Loaded ${paths.size} dynamic valid paths`);
    }).catch(err => {
        console.error('[Routes] Failed to fetch valid paths:', err.message);
    });
}

// Fetch on startup and refresh every 5 minutes
fetchValidPaths();
setInterval(fetchValidPaths, 5 * 60 * 1000);

function isKnownRoute(urlPath) {
    // Normalize: decode URI, strip trailing slash, lowercase for comparison
    let p = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);

    // Check static routes
    if (KNOWN_STATIC_ROUTES.has(p)) return true;

    // Check dynamic routes (exact match)
    if (validDynamicPaths.has(p)) return true;

    // Check pattern-based routes: /articles/:id, /services/:slug
    if (/^\/articles\/[^/]+$/.test(p)) return true;
    if (/^\/services\/[^/]+$/.test(p)) return true;

    return false;
}

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
    const urlPath = req.url.split('?')[0];
    let filePath = path.join(STATIC_DIR, urlPath === '/' ? 'index.html' : urlPath);
    const ext = path.extname(filePath);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        let isSpaFallback = false;
        if (err || !ext) {
            // SPA fallback — serve index.html
            filePath = path.join(STATIC_DIR, 'index.html');
            isSpaFallback = true;
        }

        fs.readFile(filePath, (readErr, data) => {
            if (readErr) {
                res.writeHead(500);
                res.end('Server Error');
                return;
            }

            const mimeType = MIME_TYPES[path.extname(filePath)] || 'application/octet-stream';

            // For SPA fallback routes, check if the route is known
            // If not, serve index.html with 404 status for proper SEO
            if (isSpaFallback && !isKnownRoute(urlPath)) {
                res.writeHead(404, { 'Content-Type': mimeType });
            } else {
                res.writeHead(200, { 'Content-Type': mimeType });
            }

            res.end(data);
        });
    });
});

server.listen(PORT, HOST, () => {
    console.log(`Svit Valut frontend running on ${HOST}:${PORT}`);
});
