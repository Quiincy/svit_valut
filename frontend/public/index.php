<?php
// PHP Router for React SPA on Shared Hosting
// Returns 404 status code for unknown routes while serving index.html for CSR

// Allowed file extensions that should bypass routing (if somehow intercepted)
$extension = pathinfo($_SERVER['REQUEST_URI'], PATHINFO_EXTENSION);
if (in_array(strtolower($extension), ['js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'webp', 'html'])) {
    return false; // let the web server handle the request
}

// 1. Define Static Routes
$knownStaticRoutes = [
    '/',
    '/rates',
    '/contacts',
    '/faq',
    '/login',
    '/panel',
    '/admin',
    '/operator'
];

// 2. Helper to check pattern routes
function isPatternRoute($path) {
    if (preg_match('/^\/articles\/[^\/]+$/', $path)) return true;
    if (preg_match('/^\/services\/[^\/]+$/', $path)) return true;
    return false;
}

// 3. Helper to fetch dynamic routes from the API with simple caching
function fetchDynamicRoutes() {
    $cacheFile = __DIR__ . '/routes_cache.json';
    $cacheTime = 300; // 5 minutes

    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTime) {
        $cached = json_decode(file_get_contents($cacheFile), true);
        if (is_array($cached)) return $cached;
    }

    $validPaths = [];
    $context = stream_context_create([
        'http' => ['timeout' => 3, 'ignore_errors' => true],
        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]
    ]);

    // Fast HTTP requests sequentially since file_get_contents is blocking
    // In production via CLI we could use curl_multi, but this is simple and cached
    $apiBase = "http://127.0.0.1:8000/api";
    
    // We try internal API port first (if on same server), fallback to domain
    // Since this runs on the same server, localhost:8000 is best.
    
    $endpoints = [
        $apiBase . '/seo/',
        $apiBase . '/settings',
        $apiBase . '/currencies/info',
        $apiBase . '/services'
    ];

    foreach ($endpoints as $url) {
        $response = @file_get_contents($url, false, $context);
        if ($response) {
            $data = json_decode($response, true);
            if (!$data) continue;

            if (strpos($url, '/seo/') !== false && is_array($data)) {
                foreach ($data as $item) {
                    if (isset($item['url_path'])) {
                        $p = '/' . ltrim($item['url_path'], '/');
                        $validPaths[] = rtrim($p, '/');
                    }
                }
            } elseif (strpos($url, '/settings') !== false) {
                foreach (['contacts_url', 'faq_url', 'rates_url'] as $key) {
                    if (isset($data[$key])) {
                        $p = '/' . ltrim($data[$key], '/');
                        $validPaths[] = rtrim($p, '/');
                    }
                }
            } elseif (strpos($url, '/currencies/info') !== false) {
                foreach ($data as $code => $info) {
                    if (isset($info['buy_url'])) {
                        $p = '/' . ltrim($info['buy_url'], '/');
                        $validPaths[] = rtrim($p, '/');
                    }
                    if (isset($info['sell_url'])) {
                        $p = '/' . ltrim($info['sell_url'], '/');
                        $validPaths[] = rtrim($p, '/');
                    }
                }
            } elseif (strpos($url, '/services') !== false && is_array($data)) {
                foreach ($data as $svc) {
                    if (isset($svc['link_url'])) {
                        $p = '/' . ltrim($svc['link_url'], '/');
                        $validPaths[] = rtrim($p, '/');
                    }
                }
            }
        }
    }

    $validPaths = array_unique($validPaths);
    @file_put_contents($cacheFile, json_encode($validPaths));
    
    return $validPaths;
}

// 4. Validate URI
$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);
$path = rtrim($path, '/');
if (empty($path)) $path = '/';

$isKnown = false;

// Check static
if (in_array(strtolower($path), $knownStaticRoutes)) {
    $isKnown = true;
} 
// Check patterns
elseif (isPatternRoute(strtolower($path))) {
    $isKnown = true;
} 
// Check dynamic
else {
    $dynamicRoutes = fetchDynamicRoutes();
    // Some routes might be stored with lowercase, case-insensitive check
    $lowerPaths = array_map('strtolower', $dynamicRoutes);
    if (in_array(strtolower($path), $lowerPaths)) {
        $isKnown = true;
    }
}

// 5. Output Response
if (!$isKnown) {
    header("HTTP/1.1 404 Not Found");
}

// Serve the index.html content
$indexPath = __DIR__ . '/index.html';
if (file_exists($indexPath)) {
    readfile($indexPath);
} else {
    echo "<h1>Frontend building...</h1>";
}
