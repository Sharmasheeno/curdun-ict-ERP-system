<?php

namespace App\Services;

use App\Repositories\PurchaseRepository;
use App\Repositories\ProductRepository;
use App\Repositories\SupplierRepository;
use App\Repositories\AuditLogRepository;
use Core\Database;
use Core\Validator;
use Exception;

class PurchaseService
{
    public function __construct(
        private PurchaseRepository $purchaseRepository,
        private ProductRepository $productRepository,
        private InventoryService $inventoryService,
        private SupplierRepository $supplierRepository,
        private AuditLogRepository $auditLogRepository,
        private Database $db,
        private Validator $validator
    ) {}

    public function getAll(array $filters = []): array
    {
        return $this->purchaseRepository->getAllPaginated($filters);
    }

    public function getById(int $id): array
    {
        $purchase = $this->purchaseRepository->findById($id);
        if (!$purchase) {
            throw new Exception('Purchase order not found.', 404);
        }
        $purchase['items'] = $this->purchaseRepository->getItems($id);
        return $purchase;
    }

    public function create(array $data): array
    {
        $this->validator->validate($data, [
            'supplier_id' => 'required|numeric',
            'items' => 'required|array'
        ]);

        if (empty($data['po_number'])) {
            $data['po_number'] = 'PO-' . date('Ymd') . '-' . strtoupper(uniqid());
        }

        try {
            $this->db->beginTransaction();

            $subtotal = 0;
            $items = $data['items'];
            unset($data['items']);

            $data['status'] = $data['status'] ?? 'DRAFT';
            
            $purchaseId = $this->purchaseRepository->create($data);

            foreach ($items as $item) {
                $item['purchase_id'] = $purchaseId;
                $itemTotal = $item['quantity'] * $item['unit_price'];
                $subtotal += $itemTotal;
                $this->purchaseRepository->createItem($item);
            }

            $tax = $data['tax_amount'] ?? 0;
            $discount = $data['discount_amount'] ?? 0;
            $total = $subtotal + $tax - $discount;

            $this->purchaseRepository->update($purchaseId, [
                'subtotal' => $subtotal,
                'total_amount' => $total
            ]);

            $this->db->commit();

            $this->auditLogRepository->create([
                'module' => 'PURCHASE',
                'action' => 'CREATE',
                'record_id' => $purchaseId,
                'new_values' => json_encode(['po_number' => $data['po_number']]),
                'created_at' => date('Y-m-d H:i:s')
            ]);

            return $this->getById($purchaseId);

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function update(int $id, array $data): array
    {
        $purchase = $this->getById($id);
        if (!in_array($purchase['status'], ['DRAFT', 'PENDING'])) {
            throw new Exception('Only DRAFT or PENDING purchase orders can be modified.');
        }
        
        $this->purchaseRepository->update($id, $data);
        return $this->getById($id);
    }

    public function approve(int $id): array
    {
        $purchase = $this->getById($id);
        $this->purchaseRepository->update($id, ['status' => 'APPROVED']);
        
        $this->auditLogRepository->create([
            'module' => 'PURCHASE',
            'action' => 'APPROVE',
            'record_id' => $id,
            'created_at' => date('Y-m-d H:i:s')
        ]);
        
        return $this->getById($id);
    }

    public function receive(int $id, array $receivedItems): array
    {
        $purchase = $this->getById($id);
        if ($purchase['status'] !== 'APPROVED' && $purchase['status'] !== 'PARTIAL') {
            throw new Exception('Only APPROVED or PARTIAL purchase orders can be received.');
        }

        try {
            $this->db->beginTransaction();

            $allFullyReceived = true;

            foreach ($receivedItems as $received) {
                $itemId = $received['item_id'];
                $qty = $received['quantity'];
                
                $item = $this->purchaseRepository->getItemById($itemId);
                if (!$item || $item['purchase_id'] != $id) {
                    throw new Exception("Invalid item ID: {$itemId}");
                }

                $newReceived = $item['received_quantity'] + $qty;
                if ($newReceived > $item['quantity']) {
                    throw new Exception("Cannot receive more than ordered for item {$itemId}");
                }

                $this->purchaseRepository->updateItem($itemId, ['received_quantity' => $newReceived]);

                $this->inventoryService->recordMovement($item['product_id'], 'PURCHASE', $qty, [
                    'reference_id' => $id,
                    'reference_type' => 'PURCHASE_ORDER',
                    'notes' => "Received PO {$purchase['po_number']}"
                ]);

                if ($newReceived < $item['quantity']) {
                    $allFullyReceived = false;
                }
            }

            $newStatus = $allFullyReceived ? 'RECEIVED' : 'PARTIAL';
            $this->purchaseRepository->update($id, ['status' => $newStatus]);

            $this->db->commit();

            $this->auditLogRepository->create([
                'module' => 'PURCHASE',
                'action' => 'RECEIVE',
                'record_id' => $id,
                'new_values' => json_encode(['received_items' => $receivedItems, 'status' => $newStatus]),
                'created_at' => date('Y-m-d H:i:s')
            ]);

            return $this->getById($id);

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function cancel(int $id): bool
    {
        $purchase = $this->getById($id);
        if (!in_array($purchase['status'], ['DRAFT', 'PENDING'])) {
            throw new Exception('Only DRAFT or PENDING purchase orders can be cancelled.');
        }

        $this->purchaseRepository->update($id, ['status' => 'CANCELLED']);

        $this->auditLogRepository->create([
            'module' => 'PURCHASE',
            'action' => 'CANCEL',
            'record_id' => $id,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return true;
    }
}
