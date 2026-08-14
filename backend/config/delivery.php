<?php

return [
    'public_url' => rtrim($_ENV['APP_PUBLIC_URL'] ?? 'http://127.0.0.1:8000', '/'),
    'mail' => [
        'transport' => strtolower($_ENV['MAIL_TRANSPORT'] ?? 'log'), // smtp | mail | log
        'host' => $_ENV['MAIL_HOST'] ?? '',
        'port' => (int)($_ENV['MAIL_PORT'] ?? 587),
        'username' => $_ENV['MAIL_USERNAME'] ?? '',
        'password' => $_ENV['MAIL_PASSWORD'] ?? '',
        'encryption' => strtolower($_ENV['MAIL_ENCRYPTION'] ?? 'tls'),
        'from_address' => $_ENV['MAIL_FROM_ADDRESS'] ?? 'no-reply@curdun.so',
        'from_name' => $_ENV['MAIL_FROM_NAME'] ?? 'Curdun ICT Solution',
    ],
    'sms' => [
        'transport' => strtolower($_ENV['SMS_TRANSPORT'] ?? 'log'), // http | log
        'url' => $_ENV['SMS_GATEWAY_URL'] ?? '',
        'token' => $_ENV['SMS_GATEWAY_TOKEN'] ?? '',
        'sender' => $_ENV['SMS_SENDER_ID'] ?? 'CURDUN',
    ],
    'outbox' => ROOT_PATH . '/storage/logs/delivery-outbox.log',
];
