<?php

namespace App\Services;

use App\Repositories\ProductRepository;
use App\Repositories\InventoryRepository;
use Core\Database;
use Exception;

class InventoryService
{
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
