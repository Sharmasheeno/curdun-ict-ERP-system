<?php

$allowedOrigins = isset($_ENV['CORS_ALLOWED_ORIGINS']) 
    ? explode(',', $_ENV['CORS_ALLOWED_ORIGINS']) 
    : ['http://localhost', 'http://localhost:3000', 'http://localhost:5173'];

return [
    'allowed_origins' => array_map('trim', $allowedOrigins),
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    'allow_credentials' => true,
    'max_age' => 86400,
];
