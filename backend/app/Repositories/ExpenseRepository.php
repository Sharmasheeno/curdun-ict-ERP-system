<?php

namespace App\Repositories;

class ExpenseRepository extends BaseRepository
{
    public function findAll(array $filters = [], int $page = 1, int $limit = 20): array
    {
        $params = [];
        $where = [];

        if (!empty($filters['search'])) {
            $searchCond = $this->buildSearchCondition($filters['search'], ['e.reference_number', 'e.description'], $params);
            if ($searchCond) $where[] = $searchCond;
        }

        if (!empty($filters['category_id'])) {
            $where[] = "e.category_id = :category_id";
            $params['category_id'] = $filters['category_id'];
        }

        if (!empty($filters['status'])) {
            $where[] = "e.status = :status";
            $params['status'] = $filters['status'];
        }

        $dateFilter = $this->buildDateFilter($filters['date_from'] ?? '', $filters['date_to'] ?? '', 'e.expense_date', $params);
        if ($dateFilter) $where[] = $dateFilter;

        $whereClause = empty($where) ? "" : "WHERE " . implode(" AND ", $where);
        
        $sql = "SELECT e.*, c.name as category_name, u.name as user_name 
                FROM expenses e 
                LEFT JOIN categories c ON e.category_id = c.id 
                LEFT JOIN users u ON e.user_id = u.id 
                {$whereClause} 
                ORDER BY e.expense_date DESC";

        return $this->findWithPagination($sql, $params, $page, $limit);
    }

    public function getSummaryByCategory(?int $companyId = null, string $dateFrom = '', string $dateTo = ''): array
    {
        $params = [];
        $where = [];
        
        if ($companyId) {
            // Note: If expenses have company_id, add here.
        }

        $dateFilter = $this->buildDateFilter($dateFrom, $dateTo, 'e.expense_date', $params);
        if ($dateFilter) $where[] = $dateFilter;

        $whereClause = empty($where) ? "" : "WHERE " . implode(" AND ", $where);
        
        $sql = "SELECT c.name as category_name, SUM(e.amount) as total_amount 
                FROM expenses e 
                LEFT JOIN categories c ON e.category_id = c.id 
                {$whereClause} 
                GROUP BY e.category_id, c.name 
                ORDER BY total_amount DESC";
                
        return $this->db->query($sql, $params)->fetchAll();
    }
}
