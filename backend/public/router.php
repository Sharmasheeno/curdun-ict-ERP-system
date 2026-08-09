<?php
/**
 * Router script for `php -S` built-in server.
 *
 *   php -S localhost:8000 -t public/ public/router.php
 *
 * Routing rules:
 *   1. "/"                       → serve index.html (marketing site)
 *   2. "/api/*"                  → route to index.php (PHP application)
 *   3. Any real file that exists → return false so the server serves it directly
 *   4. Anything else             → fall through to index.php
 *
 * In production (Apache/Nginx) the same behavior is expressed in .htaccess /
 * nginx.conf via mod_rewrite / try_files. This router only exists so the
 * built-in dev server behaves the same.
 */

$uri  = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$root = __DIR__;

// 1. Root path — serve marketing landing page.
if ($uri === '/' || $uri === '') {
    $indexHtml = $root . '/index.html';
    if (is_file($indexHtml)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($indexHtml);
        return true;
    }
}

// 2. API routes always go through index.php.
if (strpos($uri, '/api/') === 0) {
    require $root . '/index.php';
    return true;
}

// 3. If the URI maps to a real file on disk, let the server handle it.
//    (Handles symlinked index.html / app.html / css/*.css / js/*.js / assets/*)
$candidate = realpath($root . $uri);
if ($candidate !== false && is_file($candidate)) {
    return false; // built-in server will serve with correct MIME type
}

// 4. Fallback — send everything else to index.php (so custom PHP web routes work).
require $root . '/index.php';
return true;
