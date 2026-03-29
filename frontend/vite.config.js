import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

/**
 * Vite plugin that returns HTTP 404 for unknown SPA routes in dev mode.
 * Mirrors the production index.php logic using routes_cache.json.
 */
function spaStatusPlugin() {
  const KNOWN_STATIC = [
    '/', '/rates', '/contact', '/contacts', '/faq', '/services',
    '/login', '/panel', '/admin', '/operator',
  ]

  // File extensions that are NOT SPA routes
  const ASSET_RE = /\.(js|mjs|css|html|png|jpg|jpeg|svg|ico|woff|woff2|ttf|json|xml|txt|webp|mp3|wav|map|php)(\?|$)/

  let cachedRoutes = null
  let cacheLastRead = 0

  function loadRoutes() {
    const now = Date.now()
    // Re-read cache at most every 5 seconds
    if (cachedRoutes && now - cacheLastRead < 5000) return cachedRoutes

    const cachePath = path.resolve(__dirname, 'public/routes_cache.json')
    try {
      const raw = fs.readFileSync(cachePath, 'utf-8')
      cachedRoutes = JSON.parse(raw).map(r => {
        let p = r.trim().toLowerCase()
        if (p.endsWith('/') && p.length > 1) p = p.slice(0, -1)
        return p
      })
    } catch {
      cachedRoutes = []
    }
    cacheLastRead = now
    return cachedRoutes
  }

  function isKnown(urlPath) {
    let clean = decodeURIComponent(urlPath).toLowerCase()
    if (clean.endsWith('/') && clean.length > 1) clean = clean.slice(0, -1)

    // 1. Static routes
    if (KNOWN_STATIC.includes(clean)) return true

    // 2. Prefix matches for static (e.g. /services/old-currency)
    if (clean.startsWith('/services/') || clean.startsWith('/articles/')) return true

    // 3. Routes cache (dynamic SEO URLs)
    const routes = loadRoutes()
    if (routes.includes(clean)) return true

    return false
  }

  return {
    name: 'spa-404-status',
    configureServer(server) {
      // Pre-hook: mark unknown routes BEFORE Vite processes them
      server.middlewares.use((req, res, next) => {
        const url = req.url || '/'

        // Skip: Vite internals, assets, API proxy, static proxy, HMR
        if (
          url.startsWith('/@') ||
          url.startsWith('/node_modules/') ||
          url.startsWith('/src/') ||
          url.startsWith('/api/') ||
          url.startsWith('/static/') ||
          url.includes('__vite') ||
          ASSET_RE.test(url)
        ) {
          return next()
        }

        if (!isKnown(url)) {
          // Mark the request, intercept writeHead to override status
          req.__spa404 = true
          const origWriteHead = res.writeHead.bind(res)
          res.writeHead = function (statusCode, ...rest) {
            if (req.__spa404) {
              return origWriteHead(404, ...rest)
            }
            return origWriteHead(statusCode, ...rest)
          }
        }

        next()
      })
    }
  }
}

export default defineConfig({
  base: '/',
  plugins: [spaStatusPlugin(), react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'map-vendor': ['leaflet', 'react-leaflet'],
          'admin-vendor': ['react-quill', 'xlsx'],
        }
      }
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/static': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  define: {
    'process.env': {}
  }
})


