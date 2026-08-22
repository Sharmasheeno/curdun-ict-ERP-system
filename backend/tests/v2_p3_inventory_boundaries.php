<?php

require dirname(__DIR__) . '/vendor/autoload.php';

use App\Services\InventoryService;

$service = (new ReflectionClass(InventoryService::class))->newInstanceWithoutConstructor();
$cases = [
    [11, 10, InventoryService::NORMAL],
    [10, 10, InventoryService::LOW_STOCK],
    [1, 10, InventoryService::LOW_STOCK],
    [0, 10, InventoryService::OUT_OF_STOCK],
    [-1, 10, InventoryService::OUT_OF_STOCK],
    [1, 0, InventoryService::NORMAL],
    [0, 0, InventoryService::OUT_OF_STOCK],
];

foreach ($cases as [$stock, $minimum, $expected]) {
    $actual = $service->resolveStatus($stock, $minimum);
    if ($actual !== $expected) {
        fwrite(STDERR, "Boundary {$stock}/{$minimum}: expected {$expected}, got {$actual}\n");
        exit(1);
    }
}

echo json_encode(['verified' => true, 'cases' => $cases], JSON_PRETTY_PRINT) . PHP_EOL;
