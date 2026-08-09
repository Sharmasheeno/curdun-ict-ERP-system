<?php

namespace App\Repositories;

class WarehouseRepository extends BaseRepository
{
    public function findAll(array $filters = [], int $page = 1, int $limit = 20): array
    {
        $params = [];
        $where = [];

        if (!empty($filters['search'])) {
            $searchCond = $this->buildSearchCondition($filters['search'], ['name', 'location'], $params);
            if ($searchCond) $where[] = $searchCond;
        }

        if (!empty($filters['company_id'])) {
            $where[] = "company_id = :company_id";
            $params['company_id'] = $filters['company_id'];
        }

        $whereClause = empty($where) ? "" : "WHERE " . implode(" AND ", $where);
        $sql = "SELECT * FROM warehouses {$whereClause} ORDER BY name ASC";

        return $this->findWithPagination($sql, $params, $page, $limit);
    }

    public function findByCompany(int $companyId): array
    {
        return $this->db->query("SELECT * FROM warehouses WHERE company_id = :company_id ORDER BY name ASC", [
            'company_id' => $companyId
        ])->fetchAll();
    }
}
