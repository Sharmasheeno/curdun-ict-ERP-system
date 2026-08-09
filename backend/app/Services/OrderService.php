<?php

namespace App\Services;

use App\Repositories\OrderRepository;
use App\Repositories\ProductRepository;
use App\Repositories\CustomerRepository;
use App\Repositories\AuditLogRepository;
use Core\Database;
use Core\Validator;
use Exception;

class OrderService
{
    public function __construct(
        private OrderRepository $orderRepository,
        private ProductRepository $productRepository,
        private InventoryService $inventoryService,
        private InvoiceService $invoiceService,
        private CustomerRepository $customerRepository,
        private AuditLogRepository $auditLogRepository,
        private Database $db,
        private Validator $validator
    ) {}

    public function getAll(array $filters = []): array
    {
        return $this->orderRepository->getAllPaginated($filters);
    }

    public function getById(int $id): array
    {
        $order = $this->orderRepository->findById($id);
        if (!$order) {
            throw new Exception('Order not found.', 404);
        }
        $order['items'] = $this->orderRepository->getItems($id);
        return $order;
    }

    public function create(array $data): array
    {
        $this->validator->validate($data, [
            'customer_id' => 'required|numeric',
            'items' => 'required|array'
        ]);

        if (empty($data['order_number'])) {
            $data['order_number'] = 'ORD-' . date('Ymd') . '-' . strtoupper(uniqid());
        }

        try {
            $this->db->beginTransaction();

            $subtotal = 0;
            $items = $data['items'];
            unset($data['items']);

            $data['status'] = $data['status'] ?? 'DRAFT';
            
            $orderId = $this->orderRepository->create($data);

            foreach ($items as $item) {
                $item['order_id'] = $orderId;
                $itemTotal = $item['quantity'] * $item['unit_price'];
                $subtotal += $itemTotal;
                $this->orderRepository->createItem($item);
            }

            $tax = $data['tax_amount'] ?? 0;
            $discount = $data['discount_amount'] ?? 0;
            $total = $subtotal + $tax - $discount;

            $this->orderRepository->update($orderId, [
                'subtotal' => $subtotal,
                'total_amount' => $total
            ]);

            $this->db->commit();

            $this->auditLogRepository->create([
                'module' => 'ORDER',
                'action' => 'CREATE',
                'record_id' => $orderId,
                'new_values' => json_encode(['order_number' => $data['order_number']]),
                'created_at' => date('Y-m-d H:i:s')
            ]);

            return $this->getById($orderId);

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function update(int $id, array $data): array
    {
        $order = $this->getById($id);
        if ($order['status'] !== 'DRAFT') {
            throw new Exception('Only DRAFT orders can be modified.');
        }
        
        $this->orderRepository->update($id, $data);
        return $this->getById($id);
    }

    public function complete(int $id): array
    {
        $order = $this->getById($id);
        if (!in_array($order['status'], ['PENDING', 'CONFIRMED'])) {
            throw new Exception('Order must be PENDING or CONFIRMED to be completed.');
        }

        try {
            $this->db->beginTransaction();

            foreach ($order['items'] as $item) {
                $this->inventoryService->recordMovement($item['product_id'], 'SALE', $item['quantity'], [
                    'reference_id' => $id,
                    'reference_type' => 'SALES_ORDER',
                    'notes' => "Sale for order {$order['order_number']}"
                ]);
            }

            $invoiceData = [
                'customer_id' => $order['customer_id'],
                'order_id' => $id,
                'due_date' => date('Y-m-d', strtotime('+30 days')),
                'tax_amount' => $order['tax_amount'],
                'discount_amount' => $order['discount_amount'],
                'items' => array_map(function($item) {
                    return [
                        'product_id' => $item['product_id'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price']
                    ];
                }, $order['items'])
            ];
            
            $invoice = $this->invoiceService->createFromOrder($id, $invoiceData);

            $this->orderRepository->update($id, [
                'status' => 'COMPLETED',
                'invoice_id' => $invoice['id']
            ]);

            $this->db->commit();

            $this->auditLogRepository->create([
                'module' => 'ORDER',
                'action' => 'COMPLETE',
                'record_id' => $id,
                'created_at' => date('Y-m-d H:i:s')
            ]);

            return $this->getById($id);

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function confirm(int $id): array
    {
        $order = $this->getById($id);
        if ($order['status'] !== 'DRAFT') {
            throw new Exception('Only DRAFT orders can be confirmed.');
        }
        
        $this->orderRepository->update($id, ['status' => 'CONFIRMED']);
        return $this->getById($id);
    }

    public function cancel(int $id): bool
    {
        $order = $this->getById($id);
        if (!in_array($order['status'], ['DRAFT', 'PENDING', 'CONFIRMED'])) {
            throw new Exception('Only DRAFT, PENDING, or CONFIRMED orders can be cancelled.');
        }

        $this->orderRepository->update($id, ['status' => 'CANCELLED']);

        $this->auditLogRepository->create([
            'module' => 'ORDER',
            'action' => 'CANCEL',
            'record_id' => $id,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return true;
    }
}
