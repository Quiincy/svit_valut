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
    '/курс-валют',
    '/contacts',
    '/contact',
    '/контакти',
    '/faq',
    '/часті-питання',
    '/services',
    '/послуги',
    '/login',
    '/panel',
    '/admin',
    '/operator',
    '/обмен-',
    '/obmenyat-',
    '/obmen-',
    '/obmenyat-',
    '/privacy-policy'
];





// 4. Validate URI
$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);
$decodedPath = urldecode(rtrim($path, '/'));
if (empty($decodedPath))
    $decodedPath = '/';

$isKnown = false;
$lowerPath = mb_strtolower($decodedPath, 'UTF-8');

// Check static
if (in_array($lowerPath, $knownStaticRoutes)) {
    $isKnown = true;
}
// Catch-all for other URLs (articles, services, dynamic SEO slugs)
else {
    // We cannot reliably poll the API via HTTP on this shared host due to 508 Resource Limits.
    // Instead, a background Python script or build step generates 'routes_cache.json' containing valid URLs.
    $cacheFile = __DIR__ . '/routes_cache.json';
    if (file_exists($cacheFile)) {
        $cachedRoutes = json_decode(file_get_contents($cacheFile), true);
        if (is_array($cachedRoutes)) {
            foreach ($cachedRoutes as $dr) {
                if (mb_strtolower($dr, 'UTF-8') === $lowerPath) {
                    $isKnown = true;
                    break;
                }
            }
        }
    }
}

// 5. Output Response
// We send 404 for unknown routes to ensure SEO tools recognize them properly.
// React Router will still render the 404 UI.

$indexPath = __DIR__ . '/index.html';
if (file_exists($indexPath)) {
    if (!$isKnown) {
        header("HTTP/1.1 404 Not Found");
    } else {
        header("HTTP/1.1 200 OK");
    }
    readfile($indexPath);
} else {
    echo "<h1>Frontend building...</h1>";
}
