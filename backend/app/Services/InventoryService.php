<?php

namespace App\Services;

use App\Repositories\ProductRepository;
use App\Repositories\InventoryRepository;
use Core\Database;
use Exception;

class InventoryService
{
    public const OUT_OF_STOCK = 'OUT_OF_STOCK';
    public const LOW_STOCK = 'LOW_STOCK';
    public const NORMAL = 'NORMAL';

    public function __construct(
        private ProductRepository $productRepository,
        private InventoryRepository $inventoryRepository,
        private Database $db
    ) {}

    public function getMovements(array $filters = []): array
    {
        return $this->inventoryRepository->getMovementsPaginated($filters);
    }

    public function getSummary(?int $companyId = null): array
    {
        return $this->inventoryRepository->getSummary($companyId);
    }

    /** The only stock-condition definition used by POS inventory read models. */
    public function conditionSql(string $alias = ''): array
    {
        $prefix = $alias !== '' ? $alias . '.' : '';
        $stock = $prefix . 'current_stock';
        $minimum = $prefix . 'minimum_stock';
        $out = "{$stock}<=0";
        $low = "{$stock}>0 AND {$stock}<={$minimum}";
        return [
            'out' => $out, 'low' => $low, 'normal' => "{$stock}>{$minimum}",
            'case' => "CASE WHEN {$out} THEN '" . self::OUT_OF_STOCK . "' WHEN {$low} THEN '" . self::LOW_STOCK . "' ELSE '" . self::NORMAL . "' END",
        ];
    }

    public function resolveStatus(float $stock, float $minimum): string
    {
        if ($stock <= 0) return self::OUT_OF_STOCK;
        if ($stock <= $minimum) return self::LOW_STOCK;
        return self::NORMAL;
    }

    public function getPosProducts(int $companyId, bool $activeOnly = false): array
    {
        $condition = $this->conditionSql('p');
        $active = $activeOnly ? " AND p.status='active'" : '';
        $rows = $this->db->query(
            "SELECT p.id,p.company_id,p.category_id,p.sku,p.barcode,p.name,p.description,p.purchase_price,
                    p.selling_price,p.wholesale_price,p.minimum_stock,p.current_stock,p.status,p.created_at,
                    COALESCE(c.name,'General') category_name,{$condition['case']} stock_status
             FROM products p LEFT JOIN categories c ON c.id=p.category_id
             WHERE p.company_id=:company AND p.deleted_at IS NULL{$active} ORDER BY p.name",
            ['company' => $companyId]
        )->fetchAll();
        return array_map(fn(array $row): array => $this->normalizePosProduct($row), $rows);
    }

    public function getConditionProducts(int $companyId): array
    {
        return array_values(array_filter($this->getPosProducts($companyId, true),
            fn(array $product): bool => $product['stock_status'] !== self::NORMAL));
    }

    public function getPosSummary(int $companyId): array
    {
        $products = $this->getPosProducts($companyId, true);
        $summary = [
            'total_products' => count($products), 'normal_products' => 0,
            'low_stock_products' => 0, 'out_of_stock_products' => 0,
            'inventory_cost_value' => 0.0, 'inventory_retail_value' => 0.0,
            'inventory_scope' => ['company_id' => $companyId, 'branch_id' => null, 'location_id' => null, 'basis' => 'company_wide'],
            'inventory_value_basis' => 'purchase_price',
        ];
        foreach ($products as $product) {
            if ($product['stock_status'] === self::NORMAL) $summary['normal_products']++;
            elseif ($product['stock_status'] === self::LOW_STOCK) $summary['low_stock_products']++;
            else $summary['out_of_stock_products']++;
            $summary['inventory_cost_value'] += $product['cost_value'];
            $summary['inventory_retail_value'] += $product['retail_value'];
        }
        $summary['inventory_cost_value'] = round($summary['inventory_cost_value'], 2);
        $summary['inventory_retail_value'] = round($summary['inventory_retail_value'], 2);
        return $summary;
    }

    private function normalizePosProduct(array $row): array
    {
        $stock = (float)($row['current_stock'] ?? 0);
        $minimum = (float)($row['minimum_stock'] ?? 0);
        $row['stock_status'] = $this->resolveStatus($stock, $minimum);
        $row['needed'] = max($minimum - $stock, 0);
        $row['cost_value'] = round($stock * (float)($row['purchase_price'] ?? 0), 2);
        $row['retail_value'] = round($stock * (float)($row['selling_price'] ?? 0), 2);
        $row['inventory_context'] = ['product_id' => (int)$row['id'], 'variant_id' => null,
            'batch_id' => null, 'serial_id' => null, 'location_id' => null];
        return $row;
    }

    public function recordMovement(int $productId, string $type, float $quantity, array $extra = []): array
    {
        if ($quantity <= 0 && $type !== 'ADJUSTMENT') {
            throw new Exception("Movement quantity must be greater than zero for type {$type}.");
        }

        try {
            $this->db->beginTransaction();

            $product = $this->productRepository->lockForUpdate($productId);
            if (!$product) {
                throw new Exception('Product not found.', 404);
            }

            $quantityBefore = (float)($product['current_stock'] ?? 0);
            
            $multiplier = 1;
            if (in_array($type, ['SALE', 'TRANSFER_OUT'])) {
                $multiplier = -1;
            } elseif (in_array($type, ['PURCHASE', 'RETURN', 'TRANSFER_IN'])) {
                $multiplier = 1;
            } elseif ($type === 'ADJUSTMENT') {
                $multiplier = 1; // quantity can be negative in extra, or pass directly signed? We'll assume $quantity is signed for adjustment
            }
            
            $quantityAfter = $quantityBefore + ($quantity * $multiplier);
            
            if ($type === 'SALE' && $quantityAfter < 0) {
                throw new Exception("Insufficient stock for product ID {$productId}. Available: {$quantityBefore}, Requested: {$quantity}.");
            }

            $movementData = [
                'product_id' => $productId,
                'type' => $type,
                'quantity' => $quantity * $multiplier,
                'quantity_before' => $quantityBefore,
                'quantity_after' => $quantityAfter,
                'reference_id' => $extra['reference_id'] ?? null,
                'reference_type' => $extra['reference_type'] ?? null,
                'warehouse_id' => $extra['warehouse_id'] ?? null,
                'notes' => $extra['notes'] ?? null,
                'created_at' => date('Y-m-d H:i:s')
            ];

            $this->inventoryRepository->insertMovement($movementData);
            
            $this->productRepository->updateStock($productId, $quantityAfter);

            $this->db->commit();

            return [$quantityBefore, $quantityAfter];

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function adjustStock(int $productId, float $newQuantity, string $reason, ?int $warehouseId = null): void
    {
        $product = $this->productRepository->findById($productId);
        if (!$product) {
            throw new Exception('Product not found.');
        }

        $currentStock = (float)($product['current_stock'] ?? 0);
        $difference = $newQuantity - $currentStock;
        
        if ($difference != 0) {
            $this->recordMovement($productId, 'ADJUSTMENT', $difference, [
                'warehouse_id' => $warehouseId,
                'notes' => $reason
            ]);
        }
    }

    public function transferStock(int $productId, int $fromWarehouseId, int $toWarehouseId, float $quantity): void
    {
        if ($quantity <= 0) {
            throw new Exception("Transfer quantity must be greater than zero.");
        }

        try {
            $this->db->beginTransaction();

            // Withdraw from source
            $this->recordMovement($productId, 'TRANSFER_OUT', $quantity, [
                'warehouse_id' => $fromWarehouseId,
                'notes' => "Transfer to Warehouse ID {$toWarehouseId}"
            ]);

            // Deposit to destination
            $this->recordMovement($productId, 'TRANSFER_IN', $quantity, [
                'warehouse_id' => $toWarehouseId,
                'notes' => "Transfer from Warehouse ID {$fromWarehouseId}"
            ]);

            $this->db->commit();
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}
