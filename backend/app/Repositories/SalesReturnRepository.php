<?php

namespace App\Repositories;

class SalesReturnRepository extends BaseRepository
{
    public function findAll(array $filters = [], int $page = 1, int $limit = 20): array
    {
        $params = [];
        $where = [];

        if (!empty($filters['search'])) {
            $searchCond = $this->buildSearchCondition($filters['search'], ['sr.reference_number'], $params);
            if ($searchCond) $where[] = $searchCond;
        }

        $dateFilter = $this->buildDateFilter($filters['date_from'] ?? '', $filters['date_to'] ?? '', 'sr.return_date', $params);
        if ($dateFilter) $where[] = $dateFilter;

        $whereClause = empty($where) ? "" : "WHERE " . implode(" AND ", $where);
        
        $sql = "SELECT sr.*, c.name as customer_name, o.reference_number as order_reference 
                FROM sales_returns sr 
                LEFT JOIN customers c ON sr.customer_id = c.id 
                LEFT JOIN orders o ON sr.order_id = o.id 
                {$whereClause} 
                ORDER BY sr.created_at DESC";

        return $this->findWithPagination($sql, $params, $page, $limit);
    }

    public function findWithItems(int $id): mixed
    {
        $salesReturn = $this->db->query(
            "SELECT sr.*, c.name as customer_name FROM sales_returns sr LEFT JOIN customers c ON sr.customer_id = c.id WHERE sr.id = :id", 
            ['id' => $id]
        )->fetch();

        if (!$salesReturn) return null;

        $salesReturn['items'] = $this->db->query(
            "SELECT sri.*, pr.name as product_name, pr.sku 
             FROM sales_return_items sri 
             LEFT JOIN products pr ON sri.product_id = pr.id 
             WHERE sri.return_id = :id", 
            ['id' => $id]
        )->fetchAll();

        return $salesReturn;
    }

    public function generateReferenceNumber(): string
    {
        $prefix = "RET-" . date('Ymd') . "-";
        $sql = "SELECT reference_number FROM sales_returns WHERE reference_number LIKE :prefix ORDER BY id DESC LIMIT 1";
        $lastRef = $this->db->query($sql, ['prefix' => $prefix . '%'])->fetchColumn();
        
        if ($lastRef) {
            $number = (int)str_replace($prefix, '', $lastRef);
            $number++;
        } else {
            $number = 1;
        }
        
        return $prefix . str_pad((string)$number, 5, '0', STR_PAD_LEFT);
    }
}
