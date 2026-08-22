<?php

define('ROOT_PATH', dirname(__DIR__));
require ROOT_PATH . '/vendor/autoload.php';

if (class_exists('Dotenv\Dotenv')) {
    try { Dotenv\Dotenv::createImmutable(ROOT_PATH)->load(); } catch (Throwable) {}
}

use App\Repositories\InventoryRepository;
use App\Repositories\ProductRepository;
use App\Services\InventoryService;
use Core\Database;

$db = Database::getInstance();
$service = new InventoryService(new ProductRepository($db), new InventoryRepository($db), $db);
$db->beginTransaction();
try {
    $db->query("INSERT INTO products (company_id,category_id,sku,name,purchase_price,selling_price,minimum_stock,current_stock,status)
                VALUES (2,2,'V2-P3-ROLLBACK','V2-P3 Rollback Fixture',4,7,5,5,'active')");
    $productId = (int)$db->lastInsertId();
    $find = fn() => array_values(array_filter($service->getPosProducts(2, true),
        fn(array $row): bool => (int)$row['id'] === $productId))[0] ?? null;

    $atThreshold = $find();
    if (!$atThreshold || $atThreshold['stock_status'] !== InventoryService::LOW_STOCK || (float)$atThreshold['needed'] !== 0.0) {
        throw new RuntimeException('Threshold read model failed.');
    }

    $db->query("INSERT INTO pos_stock_alerts (company_id,product_id,severity,current_stock,minimum_stock,status)
                VALUES (2,:product,'low',5,5,'open')", ['product' => $productId]);
    $alertId = (int)$db->lastInsertId();
    $db->query("INSERT INTO pos_stock_alert_reads (alert_id,user_id) VALUES (:alert,8)", ['alert' => $alertId]);
    $conditionIds = array_column($service->getConditionProducts(2), 'id');
    if (!in_array($productId, array_map('intval', $conditionIds), true)) {
        throw new RuntimeException('Read notification incorrectly removed inventory condition.');
    }

    $db->query("UPDATE products SET current_stock=6 WHERE id=:id", ['id' => $productId]);
    $restocked = $find();
    if (!$restocked || $restocked['stock_status'] !== InventoryService::NORMAL) {
        throw new RuntimeException('Restock transition failed.');
    }

    echo json_encode([
        'verified' => true,
        'threshold' => ['stock' => 5, 'minimum' => 5, 'status' => $atThreshold['stock_status'], 'needed' => $atThreshold['needed']],
        'notification_independence' => true,
        'restock' => ['stock' => 6, 'minimum' => 5, 'status' => $restocked['stock_status']],
        'fixture_persisted' => false,
    ], JSON_PRETTY_PRINT) . PHP_EOL;
} finally {
    $db->rollBack();
}
