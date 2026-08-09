<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

$host = $_ENV['DB_HOST'] ?? '127.0.0.1';
$port = $_ENV['DB_PORT'] ?? '3306';
$dbName = $_ENV['DB_DATABASE'] ?? 'curdun_erp';
$username = $_ENV['DB_USERNAME'] ?? 'root';
$password = $_ENV['DB_PASSWORD'] ?? '';

echo "Importing curdun_erp.sql database schema and seed data...\n";

try {
    $pdo = new PDO("mysql:host=$host;port=$port", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    $sqlFile = __DIR__ . '/curdun_erp.sql';
    if (!file_exists($sqlFile)) {
        die("Error: curdun_erp.sql not found at $sqlFile\n");
    }

    $sql = file_get_contents($sqlFile);
    $pdo->exec($sql);

    echo "Success! Database '{$dbName}' created and seeded successfully.\n";

} catch (PDOException $e) {
    die("Database setup failed: " . $e->getMessage() . "\n");
}
