<?php

define('ROOT_PATH', dirname(__DIR__));

if (file_exists(ROOT_PATH . '/vendor/autoload.php')) {
    require_once ROOT_PATH . '/vendor/autoload.php';
}

if (class_exists('Dotenv\Dotenv')) {
    $dotenv = Dotenv\Dotenv::createImmutable(ROOT_PATH);
    try {
        $dotenv->load();
    } catch (\Exception $e) {
        // Ignored if .env doesn't exist
    }
}

$appConfig = require ROOT_PATH . '/config/app.php';
$corsConfig = require ROOT_PATH . '/config/cors.php';
$securityConfig = require ROOT_PATH . '/config/security.php';
require_once ROOT_PATH . '/config/constants.php';

if ($appConfig['debug']) {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', 0);
    ini_set('display_startup_errors', 0);
    error_reporting(0);
}

date_default_timezone_set($appConfig['timezone']);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'])) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: ' . implode(', ', $corsConfig['allowed_methods']));
header('Access-Control-Allow-Headers: ' . implode(', ', $corsConfig['allowed_headers']));
if ($corsConfig['allow_credentials']) {
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Max-Age: ' . $corsConfig['max_age']);

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('X-Frame-Options: SAMEORIGIN');
header('X-Content-Type-Options: nosniff');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self';");
header('Content-Type: application/json; charset=utf-8');

try {
    Core\Session::start();
    $request = new Core\Request();
    $router  = new Core\Router();

    if (file_exists(ROOT_PATH . '/routes/web.php')) {
        require_once ROOT_PATH . '/routes/web.php';
    }
    if (file_exists(ROOT_PATH . '/routes/api.php')) {
        require_once ROOT_PATH . '/routes/api.php';
    }

    $router->dispatch($request);
} catch (\Throwable $e) {
    if (class_exists('Core\ExceptionHandler')) {
        Core\ExceptionHandler::handle($e);
    } else {
        // Use the exception's own code as the HTTP status if it looks like one
        // (400-599). Domain exceptions in services throw with 401/403/404/409 etc.
        $code = (int) $e->getCode();
        $status = ($code >= 400 && $code < 600) ? $code : 500;
        http_response_code($status);
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage() ?: 'An unexpected error occurred.',
            'data' => null,
            'errors' => $appConfig['debug'] && $status >= 500 ? [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ] : null,
        ]);
    }
}
