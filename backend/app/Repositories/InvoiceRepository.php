<?php

namespace App\Repositories;

class InvoiceRepository extends BaseRepository
{
    public function findAll(array $filters = [], int $page = 1, int $limit = 20): array
    {
        $params = [];
        $where = [];

        if (!empty($filters['search'])) {
            $searchCond = $this->buildSearchCondition($filters['search'], ['i.invoice_number'], $params);
            if ($searchCond) $where[] = $searchCond;
        }

        if (!empty($filters['status'])) {
            $where[] = "i.status = :status";
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['customer_id'])) {
            $where[] = "i.customer_id = :customer_id";
            $params['customer_id'] = $filters['customer_id'];
        }

        $dateFilter = $this->buildDateFilter($filters['date_from'] ?? '', $filters['date_to'] ?? '', 'i.invoice_date', $params);
        if ($dateFilter) $where[] = $dateFilter;

        $whereClause = empty($where) ? "" : "WHERE " . implode(" AND ", $where);
        
        $sql = "SELECT i.*, c.name as customer_name 
                FROM invoices i 
                LEFT JOIN customers c ON i.customer_id = c.id 
                {$whereClause} 
                ORDER BY i.created_at DESC";

        return $this->findWithPagination($sql, $params, $page, $limit);
    }

    public function findWithItems(int $id): mixed
    {
        $invoice = $this->db->query(
            "SELECT i.*, c.name as customer_name FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE i.id = :id", 
            ['id' => $id]
        )->fetch();

        if (!$invoice) return null;

        $invoice['items'] = $this->db->query(
            "SELECT ii.*, pr.name as product_name 
             FROM invoice_items ii 
             LEFT JOIN products pr ON ii.product_id = pr.id 
             WHERE ii.invoice_id = :id", 
            ['id' => $id]
        )->fetchAll();

        $invoice['payments'] = $this->db->query(
            "SELECT * FROM payments WHERE invoice_id = :id ORDER BY payment_date DESC", 
            ['id' => $id]
        )->fetchAll();

        return $invoice;
    }

    public function generateInvoiceNumber(): string
    {
        $prefix = "INV-" . date('Ymd') . "-";
        $sql = "SELECT invoice_number FROM invoices WHERE invoice_number LIKE :prefix ORDER BY id DESC LIMIT 1";
        $lastRef = $this->db->query($sql, ['prefix' => $prefix . '%'])->fetchColumn();
        
        if ($lastRef) {
            $number = (int)str_replace($prefix, '', $lastRef);
            $number++;
        } else {
            $number = 1;
        }
        
        return $prefix . str_pad((string)$number, 5, '0', STR_PAD_LEFT);
    }

    public function updatePaidAmount(int $invoiceId, float $newPaidAmount): void
    {
        $invoice = $this->db->query("SELECT total_amount FROM invoices WHERE id = :id", ['id' => $invoiceId])->fetch();
        if (!$invoice) return;

        $totalAmount = (float)$invoice['total_amount'];
        $status = 'UNPAID';
        
        if ($newPaidAmount >= $totalAmount) {
            $status = 'PAID';
        } elseif ($newPaidAmount > 0) {
            $status = 'PARTIAL';
        }

        $this->db->query("UPDATE invoices SET paid_amount = :paid, status = :status WHERE id = :id", [
            'paid' => $newPaidAmount,
            'status' => $status,
            'id' => $invoiceId
        ]);
    }

    public function getOverdueInvoices(): array
    {
        $sql = "SELECT i.*, c.name as customer_name 
                FROM invoices i 
                LEFT JOIN customers c ON i.customer_id = c.id 
                WHERE i.due_date < NOW() AND i.status NOT IN ('PAID', 'CANCELLED') 
                ORDER BY i.due_date ASC";
                
        return $this->db->query($sql)->fetchAll();
    }
}
