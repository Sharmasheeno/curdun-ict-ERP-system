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

/**
 * Resolve a URI-relative path to the real file to serve.
 *
 * The repo ships frontend assets (index.html, app.html, css/, js/, assets/)
 * as git symlinks that point one directory up. On Linux/macOS the symlinks
 * work and the file lands in public/ directly. On Windows the symlinks are
 * stored as PLAIN TEXT files containing the target path — attempting to
 * serve them returns the literal string "../../index.html". This resolver
 * treats such stub files as portable symlinks so `php -S` works on Windows
 * without needing developer-mode symlink permissions.
 */
function router_resolve(string $root, string $uri): ?string
{
    $candidate = $root . $uri;
    if (!file_exists($candidate)) {
        // Fallback: repo-root frontend file (index.html, app.html, css/, js/, assets/)
        $fallback = realpath($root . '/../..' . $uri);
        return ($fallback !== false && is_file($fallback)) ? $fallback : null;
    }
    if (is_dir($candidate)) return null;
    // Detect a git-stored symlink that landed as a small text file
    // (< 4KB, single line starting with a relative path segment).
    if (is_file($candidate) && filesize($candidate) < 4096) {
        $content = trim((string)file_get_contents($candidate));
        if ($content !== '' && preg_match('#^(?:\.\./|\./|[A-Za-z0-9_.-]+/)#', $content) && strpos($content, "\n") === false) {
            $target = realpath(dirname($candidate) . '/' . $content);
            if ($target !== false && is_file($target)) return $target;
        }
    }
    $real = realpath($candidate);
    return ($real !== false && is_file($real)) ? $real : null;
}

function router_send(string $file): void
{
    $mime = match (strtolower(pathinfo($file, PATHINFO_EXTENSION))) {
        'html','htm' => 'text/html; charset=utf-8',
        'css'  => 'text/css; charset=utf-8',
        'js','mjs' => 'application/javascript; charset=utf-8',
        'json' => 'application/json; charset=utf-8',
        'svg'  => 'image/svg+xml',
        'png'  => 'image/png',
        'jpg','jpeg' => 'image/jpeg',
        'gif'  => 'image/gif',
        'webp' => 'image/webp',
        'ico'  => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2'=> 'font/woff2',
        'ttf'  => 'font/ttf',
        'map'  => 'application/json; charset=utf-8',
        default => 'application/octet-stream',
    };
    header('Content-Type: ' . $mime);
    readfile($file);
}

// 1. Root path — serve marketing landing page.
if ($uri === '/' || $uri === '') {
    $indexHtml = router_resolve($root, '/index.html');
    if ($indexHtml !== null) { router_send($indexHtml); return true; }
}

// 2. API routes always go through index.php.
if (strpos($uri, '/api/') === 0) {
    require $root . '/index.php';
    return true;
}

// 3. If the URI resolves to a real file (directly, via git-symlink fallback,
//    or from the repo root), serve it with the correct MIME type ourselves.
//    We do NOT return false because the built-in server would try to serve
//    the git-symlink STUB (a text file containing "../../foo") verbatim.
$resolved = router_resolve($root, $uri);
if ($resolved !== null) { router_send($resolved); return true; }

// 4. Fallback — send everything else to index.php (so custom PHP web routes work).
require $root . '/index.php';
return true;
