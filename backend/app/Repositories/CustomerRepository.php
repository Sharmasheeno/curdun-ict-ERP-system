<?php

namespace App\Repositories;

class CustomerRepository extends BaseRepository
{
    public function findAll(array $filters = [], int $page = 1, int $limit = 20): array
    {
        $params = [];
        $where = [];

        if (!empty($filters['search'])) {
            $searchCond = $this->buildSearchCondition($filters['search'], ['name', 'phone', 'email', 'customer_code'], $params);
            if ($searchCond) $where[] = $searchCond;
        }

        if (!empty($filters['status'])) {
            $statusCond = $this->buildStatusFilter($filters['status'], $params);
            if ($statusCond) $where[] = $statusCond;
        }

        $whereClause = empty($where) ? "" : "WHERE " . implode(" AND ", $where);
        
        $allowedSorts = ['name', 'created_at', 'customer_code'];
        $sort = in_array($filters['sort'] ?? '', $allowedSorts) ? $filters['sort'] : 'created_at';
        $order = strtoupper($filters['order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

        $sql = "SELECT * FROM customers {$whereClause} ORDER BY {$sort} {$order}";

        return $this->findWithPagination($sql, $params, $page, $limit);
    }

    public function findByCode(string $code): mixed
    {
        return $this->db->query("SELECT * FROM customers WHERE customer_code = :code", ['code' => $code])->fetch();
    }

    public function generateCode(?int $companyId = null): string
    {
        $prefix = "CUST-";
        $sql = "SELECT customer_code FROM customers WHERE customer_code LIKE :prefix ORDER BY id DESC LIMIT 1";
        $lastCode = $this->db->query($sql, ['prefix' => $prefix . '%'])->fetchColumn();
        
        if ($lastCode) {
            $number = (int)str_replace($prefix, '', $lastCode);
            $number++;
        } else {
            $number = 1;
        }
        
        return $prefix . str_pad((string)$number, 5, '0', STR_PAD_LEFT);
    }

    public function getTopCustomers(int $limit = 10): array
    {
        $sql = "SELECT c.id, c.name, c.customer_code, COUNT(o.id) as total_orders, COALESCE(SUM(o.total_amount), 0) as total_revenue
                FROM customers c
                LEFT JOIN orders o ON c.id = o.customer_id
                GROUP BY c.id
                ORDER BY total_revenue DESC
                LIMIT " . (int)$limit;
                
        return $this->db->query($sql)->fetchAll();
    }
}
