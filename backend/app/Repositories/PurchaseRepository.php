<?php

namespace App\Repositories;

class PurchaseRepository extends BaseRepository
{
    public function findAll(array $filters = [], int $page = 1, int $limit = 20): array
    {
        $params = [];
        $where = [];

        if (!empty($filters['search'])) {
            $searchCond = $this->buildSearchCondition($filters['search'], ['p.reference_number'], $params);
            if ($searchCond) $where[] = $searchCond;
        }

        if (!empty($filters['status'])) {
            $where[] = "p.status = :status";
            $params['status'] = $filters['status'];
        }

        $dateFilter = $this->buildDateFilter($filters['date_from'] ?? '', $filters['date_to'] ?? '', 'p.purchase_date', $params);
        if ($dateFilter) $where[] = $dateFilter;

        $whereClause = empty($where) ? "" : "WHERE " . implode(" AND ", $where);
        
        $sql = "SELECT p.*, s.name as supplier_name, u.name as user_name 
                FROM purchases p 
                LEFT JOIN suppliers s ON p.supplier_id = s.id 
                LEFT JOIN users u ON p.user_id = u.id 
                {$whereClause} 
                ORDER BY p.created_at DESC";

        return $this->findWithPagination($sql, $params, $page, $limit);
    }

    public function findWithItems(int $id): mixed
    {
        $purchase = $this->db->query(
            "SELECT p.*, s.name as supplier_name FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = :id", 
            ['id' => $id]
        )->fetch();

        if (!$purchase) return null;

        $purchase['items'] = $this->db->query(
            "SELECT pi.*, pr.name as product_name, pr.sku 
             FROM purchase_items pi 
             LEFT JOIN products pr ON pi.product_id = pr.id 
             WHERE pi.purchase_id = :id", 
            ['id' => $id]
        )->fetchAll();

        return $purchase;
    }

    public function generateReferenceNumber(): string
    {
        $prefix = "PO-" . date('Ymd') . "-";
        $sql = "SELECT reference_number FROM purchases WHERE reference_number LIKE :prefix ORDER BY id DESC LIMIT 1";
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
        return (bool) $this->db->query("UPDATE purchases SET status = :status WHERE id = :id", [
            'status' => $status,
            'id' => $id
        ]);
    }
}
