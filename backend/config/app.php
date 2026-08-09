<?php

if (class_exists('Dotenv\Dotenv')) {
    $dotenv = Dotenv\Dotenv::createImmutable(dirname(__DIR__));
    try {
        $dotenv->load();
    } catch (\Exception $e) {
        // Ignored if .env doesn't exist
    }
}

return [
    'name' => $_ENV['APP_NAME'] ?? 'Curdun ERP',
    'env' => $_ENV['APP_ENV'] ?? 'local',
    'debug' => filter_var($_ENV['APP_DEBUG'] ?? false, FILTER_VALIDATE_BOOLEAN),
    'url' => $_ENV['APP_URL'] ?? 'http://localhost/curdun-ict-ERP-system-main/backend',
    'version' => $_ENV['APP_VERSION'] ?? '1.0.0',
    'timezone' => $_ENV['APP_TIMEZONE'] ?? 'Africa/Mogadishu',
];
