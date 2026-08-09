<?php

namespace App\Repositories;

class PaymentRepository extends BaseRepository
{
    public function findAll(array $filters = [], int $page = 1, int $limit = 20): array
    {
        $params = [];
        $where = [];

        if (!empty($filters['search'])) {
            $searchCond = $this->buildSearchCondition($filters['search'], ['p.reference_number'], $params);
            if ($searchCond) $where[] = $searchCond;
        }

        if (!empty($filters['payment_method'])) {
            $where[] = "p.payment_method = :payment_method";
            $params['payment_method'] = $filters['payment_method'];
        }

        $dateFilter = $this->buildDateFilter($filters['date_from'] ?? '', $filters['date_to'] ?? '', 'p.payment_date', $params);
        if ($dateFilter) $where[] = $dateFilter;

        $whereClause = empty($where) ? "" : "WHERE " . implode(" AND ", $where);
        
        $sql = "SELECT p.*, i.invoice_number 
                FROM payments p 
                LEFT JOIN invoices i ON p.invoice_id = i.id 
                {$whereClause} 
                ORDER BY p.payment_date DESC";

        return $this->findWithPagination($sql, $params, $page, $limit);
    }

    public function findByInvoice(int $invoiceId): array
    {
        return $this->db->query(
            "SELECT * FROM payments WHERE invoice_id = :invoice_id ORDER BY payment_date DESC", 
            ['invoice_id' => $invoiceId]
        )->fetchAll();
    }

    public function getTotalPaidForInvoice(int $invoiceId): float
    {
        $result = $this->db->query(
            "SELECT SUM(amount) as total FROM payments WHERE invoice_id = :invoice_id", 
            ['invoice_id' => $invoiceId]
        )->fetchColumn();
        
        return (float) $result;
    }
}
