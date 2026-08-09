<?php

namespace App\Services;

use App\Repositories\InvoiceRepository;
use App\Repositories\AuditLogRepository;
use Core\Database;
use Core\Validator;
use Exception;

class InvoiceService
{
    public function __construct(
        private InvoiceRepository $invoiceRepository,
        private AuditLogRepository $auditLogRepository,
        private Database $db,
        private Validator $validator
    ) {}

    public function getAll(array $filters = []): array
    {
        return $this->invoiceRepository->getAllPaginated($filters);
    }

    public function getById(int $id): array
    {
        $invoice = $this->invoiceRepository->findById($id);
        if (!$invoice) {
            throw new Exception('Invoice not found.', 404);
        }
        $invoice['items'] = $this->invoiceRepository->getItems($id);
        $invoice['payments'] = $this->invoiceRepository->getPayments($id);
        return $invoice;
    }

    public function calculateTotals(array $items, float $taxRate = 0, float $discountAmount = 0): array
    {
        $subtotal = 0;
        foreach ($items as $item) {
            $subtotal += ($item['quantity'] * $item['unit_price']);
        }
        $taxAmount = ($subtotal * $taxRate) / 100;
        $total = $subtotal + $taxAmount - $discountAmount;
        return [$subtotal, $taxAmount, $total];
    }

    public function create(array $data): array
    {
        $this->validator->validate($data, [
            'customer_id' => 'required|numeric',
            'items' => 'required|array'
        ]);

        if (empty($data['invoice_number'])) {
            $data['invoice_number'] = 'INV-' . date('Ymd') . '-' . strtoupper(uniqid());
        }

        try {
            $this->db->beginTransaction();

            $items = $data['items'];
            unset($data['items']);
            
            $taxRate = $data['tax_rate'] ?? 0;
            $discount = $data['discount_amount'] ?? 0;
            
            [$subtotal, $taxAmount, $total] = $this->calculateTotals($items, $taxRate, $discount);
            
            $data['subtotal'] = $subtotal;
            $data['tax_amount'] = $taxAmount;
            $data['total_amount'] = $total;
            $data['balance'] = $total;
            $data['paid_amount'] = 0;
            $data['status'] = $data['status'] ?? 'DRAFT';

            $invoiceId = $this->invoiceRepository->create($data);

            foreach ($items as $item) {
                $item['invoice_id'] = $invoiceId;
                $this->invoiceRepository->createItem($item);
            }

            $this->db->commit();

            $this->auditLogRepository->create([
                'module' => 'INVOICE',
                'action' => 'CREATE',
                'record_id' => $invoiceId,
                'created_at' => date('Y-m-d H:i:s')
            ]);

            return $this->getById($invoiceId);
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function createFromOrder(int $orderId, array $orderData): array
    {
        if (empty($orderData['invoice_number'])) {
            $orderData['invoice_number'] = 'INV-ORD-' . date('Ymd') . '-' . strtoupper(uniqid());
        }
        return $this->create($orderData);
    }

    public function update(int $id, array $data): array
    {
        $invoice = $this->getById($id);
        if ($invoice['status'] !== 'DRAFT') {
            throw new Exception('Only DRAFT invoices can be modified.');
        }
        $this->invoiceRepository->update($id, $data);
        return $this->getById($id);
    }

    public function sendInvoice(int $id): array
    {
        $invoice = $this->getById($id);
        if ($invoice['status'] === 'DRAFT') {
            $this->invoiceRepository->update($id, ['status' => 'SENT']);
        }
        return $this->getById($id);
    }

    public function cancel(int $id): bool
    {
        $invoice = $this->getById($id);
        if ($invoice['status'] === 'PAID') {
            throw new Exception('PAID invoices cannot be cancelled.');
        }

        $this->invoiceRepository->update($id, ['status' => 'CANCELLED']);

        $this->auditLogRepository->create([
            'module' => 'INVOICE',
            'action' => 'CANCEL',
            'record_id' => $id,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return true;
    }

    public function getOverdue(): array
    {
        return $this->invoiceRepository->getOverdue();
    }
}
