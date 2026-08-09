<?php

namespace App\Repositories;

class OrderRepository extends BaseRepository
{
    public function findAll(array $filters = [], int $page = 1, int $limit = 20): array
    {
        $params = [];
        $where = [];

        if (!empty($filters['search'])) {
            $searchCond = $this->buildSearchCondition($filters['search'], ['o.reference_number'], $params);
            if ($searchCond) $where[] = $searchCond;
        }

        if (!empty($filters['status'])) {
            $where[] = "o.status = :status";
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['customer_id'])) {
            $where[] = "o.customer_id = :customer_id";
            $params['customer_id'] = $filters['customer_id'];
        }

        $dateFilter = $this->buildDateFilter($filters['date_from'] ?? '', $filters['date_to'] ?? '', 'o.order_date', $params);
        if ($dateFilter) $where[] = $dateFilter;

        $whereClause = empty($where) ? "" : "WHERE " . implode(" AND ", $where);
        
        $sql = "SELECT o.*, c.name as customer_name, u.name as user_name 
                FROM orders o 
                LEFT JOIN customers c ON o.customer_id = c.id 
                LEFT JOIN users u ON o.user_id = u.id 
                {$whereClause} 
                ORDER BY o.created_at DESC";

        return $this->findWithPagination($sql, $params, $page, $limit);
    }

    public function findWithItems(int $id): mixed
    {
        $order = $this->db->query(
            "SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.id = :id", 
            ['id' => $id]
        )->fetch();

        if (!$order) return null;

        $order['items'] = $this->db->query(
            "SELECT oi.*, pr.name as product_name, pr.sku 
             FROM order_items oi 
             LEFT JOIN products pr ON oi.product_id = pr.id 
             WHERE oi.order_id = :id", 
            ['id' => $id]
        )->fetchAll();

        return $order;
    }

    public function generateReferenceNumber(): string
    {
        $prefix = "ORD-" . date('Ymd') . "-";
        $sql = "SELECT reference_number FROM orders WHERE reference_number LIKE :prefix ORDER BY id DESC LIMIT 1";
        $lastRef = $this->db->query($sql, ['prefix' => $prefix . '%'])->fetchColumn();
        
        if ($lastRef) {
            $number = (int)str_replace($prefix, '', $lastRef);
            $number++;
        } else {
            $number = 1;
        }
        
        return $prefix . str_pad((string)$number, 5, '0', STR_PAD_LEFT);
    }

    public function updateStatus(int $id, string $status): bool
    {
        return (bool) $this->db->query("UPDATE orders SET status = :status WHERE id = :id", [
            'status' => $status,
            'id' => $id
        ]);
    }

    public function setInvoiceId(int $orderId, int $invoiceId): void
    {
        $this->db->query("UPDATE orders SET invoice_id = :invoice_id WHERE id = :id", [
            'invoice_id' => $invoiceId,
            'id' => $orderId
        ]);
    }
}
