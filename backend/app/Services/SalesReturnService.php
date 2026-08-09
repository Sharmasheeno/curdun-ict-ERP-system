<?php

namespace App\Services;

use App\Repositories\SalesReturnRepository;
use App\Repositories\OrderRepository;
use App\Repositories\ProductRepository;
use App\Repositories\InvoiceRepository;
use App\Repositories\AuditLogRepository;
use Core\Database;
use Core\Validator;
use Exception;

class SalesReturnService
{
    public function __construct(
        private SalesReturnRepository $salesReturnRepository,
        private OrderRepository $orderRepository,
        private ProductRepository $productRepository,
        private InventoryService $inventoryService,
        private InvoiceRepository $invoiceRepository,
        private AuditLogRepository $auditLogRepository,
        private Database $db,
        private Validator $validator
    ) {}

    public function getAll(array $filters = []): array
    {
        return $this->salesReturnRepository->getAllPaginated($filters);
    }

    public function getById(int $id): array
    {
        $ret = $this->salesReturnRepository->findById($id);
        if (!$ret) {
            throw new Exception('Sales return not found.', 404);
        }
        $ret['items'] = $this->salesReturnRepository->getItems($id);
        return $ret;
    }

    public function create(array $data): array
    {
        $this->validator->validate($data, [
            'order_id' => 'required|numeric',
            'items' => 'required|array'
        ]);

        $order = $this->orderRepository->findById($data['order_id']);
        if (!$order || $order['status'] !== 'COMPLETED') {
            throw new Exception('Original order must be COMPLETED.');
        }
        $orderItems = $this->orderRepository->getItems($data['order_id']);
        $orderItemsMap = [];
        foreach ($orderItems as $item) {
            $orderItemsMap[$item['product_id']] = $item;
        }

        try {
            $this->db->beginTransaction();

            if (empty($data['return_number'])) {
                $data['return_number'] = 'RET-' . date('Ymd') . '-' . strtoupper(uniqid());
            }
            $data['status'] = 'PENDING';
            $data['customer_id'] = $order['customer_id'];

            $totalAmount = 0;
            $items = $data['items'];
            unset($data['items']);
            
            $returnId = $this->salesReturnRepository->create($data);

            foreach ($items as $item) {
                $productId = $item['product_id'];
                $qty = $item['quantity'];

                if (!isset($orderItemsMap[$productId])) {
                    throw new Exception("Product {$productId} was not part of the original order.");
                }
                if ($qty > $orderItemsMap[$productId]['quantity']) {
                    throw new Exception("Return quantity cannot exceed original sold quantity for product {$productId}.");
                }

                $item['sales_return_id'] = $returnId;
                $item['unit_price'] = $orderItemsMap[$productId]['unit_price'];
                $totalAmount += $qty * $item['unit_price'];

                $this->salesReturnRepository->createItem($item);

                // Re-stock inventory
                $this->inventoryService->recordMovement($productId, 'RETURN', $qty, [
                    'reference_id' => $returnId,
                    'reference_type' => 'SALES_RETURN',
                    'notes' => "Return for order {$order['order_number']}"
                ]);
            }

            $this->salesReturnRepository->update($returnId, ['total_amount' => $totalAmount]);

            // Adjust invoice if exists
            if ($order['invoice_id']) {
                $invoice = $this->invoiceRepository->findById($order['invoice_id']);
                if ($invoice) {
                    $newTotal = $invoice['total_amount'] - $totalAmount;
                    $balance = $newTotal - $invoice['paid_amount'];
                    $invStatus = $invoice['status'];
                    if ($balance <= 0) {
                        $invStatus = 'PAID';
                        $balance = 0;
                    }
                    $this->invoiceRepository->update($invoice['id'], [
                        'total_amount' => $newTotal,
                        'balance' => $balance,
                        'status' => $invStatus
                    ]);
                }
            }

            $this->db->commit();

            $this->auditLogRepository->create([
                'module' => 'SALES_RETURN',
                'action' => 'CREATE',
                'record_id' => $returnId,
                'created_at' => date('Y-m-d H:i:s')
            ]);

            return $this->getById($returnId);

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function approve(int $id): array
    {
        $this->salesReturnRepository->update($id, ['status' => 'APPROVED']);
        return $this->getById($id);
    }

    public function reject(int $id): array
    {
        $this->salesReturnRepository->update($id, ['status' => 'REJECTED']);
        return $this->getById($id);
    }
}
