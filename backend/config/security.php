<?php

return [
    'session_lifetime' => (int)($_ENV['SESSION_LIFETIME'] ?? 7200),
    'session_name' => $_ENV['SESSION_NAME'] ?? 'curdun_session',
    'cookie_secure' => filter_var($_ENV['COOKIE_SECURE'] ?? true, FILTER_VALIDATE_BOOLEAN),
    'cookie_httponly' => filter_var($_ENV['COOKIE_HTTPONLY'] ?? true, FILTER_VALIDATE_BOOLEAN),
    'cookie_samesite' => $_ENV['COOKIE_SAMESITE'] ?? 'Lax',
    'rate_limit_attempts' => (int)($_ENV['RATE_LIMIT_ATTEMPTS'] ?? 5),
    'rate_limit_decay' => (int)($_ENV['RATE_LIMIT_DECAY'] ?? 300),
    'password_algo' => PASSWORD_BCRYPT,
    'password_options' => ['cost' => 12],
];
