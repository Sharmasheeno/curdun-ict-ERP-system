<?php

namespace App\Repositories;

class SupplierRepository extends BaseRepository
{
    public function findAll(array $filters = [], int $page = 1, int $limit = 20): array
    {
        $params = [];
        $where = [];

        if (!empty($filters['search'])) {
            $searchCond = $this->buildSearchCondition($filters['search'], ['name', 'phone', 'email', 'supplier_code'], $params);
            if ($searchCond) $where[] = $searchCond;
        }

        if (!empty($filters['status'])) {
            $statusCond = $this->buildStatusFilter($filters['status'], $params);
            if ($statusCond) $where[] = $statusCond;
        }

        $whereClause = empty($where) ? "" : "WHERE " . implode(" AND ", $where);
        
        $allowedSorts = ['name', 'created_at', 'supplier_code'];
        $sort = in_array($filters['sort'] ?? '', $allowedSorts) ? $filters['sort'] : 'created_at';
        $order = strtoupper($filters['order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

        $sql = "SELECT * FROM suppliers {$whereClause} ORDER BY {$sort} {$order}";

        return $this->findWithPagination($sql, $params, $page, $limit);
    }

    public function findByCode(string $code): mixed
    {
        return $this->db->query("SELECT * FROM suppliers WHERE supplier_code = :code", ['code' => $code])->fetch();
    }

    public function generateCode(?int $companyId = null): string
    {
        $prefix = "SUPP-";
        $sql = "SELECT supplier_code FROM suppliers WHERE supplier_code LIKE :prefix ORDER BY id DESC LIMIT 1";
        $lastCode = $this->db->query($sql, ['prefix' => $prefix . '%'])->fetchColumn();
        
        if ($lastCode) {
            $number = (int)str_replace($prefix, '', $lastCode);
            $number++;
        } else {
            $number = 1;
        }
        
        return $prefix . str_pad((string)$number, 5, '0', STR_PAD_LEFT);
    }
}
