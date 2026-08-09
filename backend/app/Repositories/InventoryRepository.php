<?php

namespace App\Repositories;

class InventoryRepository extends BaseRepository
{
    public function getStockMovements(array $filters = [], int $page = 1, int $limit = 20): array
    {
        $params = [];
        $where = [];

        if (!empty($filters['product_id'])) {
            $where[] = "m.product_id = :product_id";
            $params['product_id'] = $filters['product_id'];
        }

        if (!empty($filters['type'])) {
            $where[] = "m.type = :type";
            $params['type'] = $filters['type'];
        }

        $dateFilter = $this->buildDateFilter($filters['date_from'] ?? '', $filters['date_to'] ?? '', 'm.created_at', $params);
        if ($dateFilter) $where[] = $dateFilter;

        $whereClause = empty($where) ? "" : "WHERE " . implode(" AND ", $where);
        
        $sql = "SELECT m.*, p.name as product_name, p.sku, u.name as user_name 
                FROM stock_movements m 
                LEFT JOIN products p ON m.product_id = p.id 
                LEFT JOIN users u ON m.user_id = u.id 
                {$whereClause} 
                ORDER BY m.created_at DESC";

        return $this->findWithPagination($sql, $params, $page, $limit);
    }

    public function createMovement(array $data): void
    {
        $sql = "INSERT INTO stock_movements (product_id, type, quantity, reference_id, reference_type, notes, user_id) 
                VALUES (:product_id, :type, :quantity, :reference_id, :reference_type, :notes, :user_id)";
        
        $this->db->query($sql, [
            'product_id' => $data['product_id'],
            'type' => $data['type'],
            'quantity' => $data['quantity'],
            'reference_id' => $data['reference_id'] ?? null,
            'reference_type' => $data['reference_type'] ?? null,
            'notes' => $data['notes'] ?? '',
            'user_id' => $data['user_id']
        ]);
    }

    public function getInventorySummary(?int $companyId = null): array
    {
        $sql = "SELECT p.id, p.name, p.sku, p.current_stock, c.name as category_name, u.name as unit_name 
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id 
                LEFT JOIN units u ON p.unit_id = u.id 
                ORDER BY p.name ASC";
                
        return $this->db->query($sql)->fetchAll();
    }
}
