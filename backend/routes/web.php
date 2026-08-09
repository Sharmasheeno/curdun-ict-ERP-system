<?php
// routes/web.php

$router->get('/', function() {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'message' => 'Curdun ERP API is running perfectly!',
        'data' => null,
        'errors' => null
    ]);
    exit;
});
