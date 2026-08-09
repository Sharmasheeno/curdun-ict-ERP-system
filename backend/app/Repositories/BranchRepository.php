<?php

namespace App\Repositories;

class BranchRepository extends BaseRepository
{
    public function findByCompany(int $companyId): array
    {
        return $this->db->query("SELECT * FROM branches WHERE company_id = :company_id ORDER BY name ASC", [
            'company_id' => $companyId
        ])->fetchAll();
    }

    public function findAll(array $filters = [], int $page = 1, int $limit = 20): array
    {
        $params = [];
        $where = [];

        if (!empty($filters['company_id'])) {
            $where[] = "company_id = :company_id";
            $params['company_id'] = $filters['company_id'];
        }

        if (!empty($filters['search'])) {
            $searchCond = $this->buildSearchCondition($filters['search'], ['name', 'code'], $params);
            if ($searchCond) $where[] = $searchCond;
        }

        $whereClause = empty($where) ? "" : "WHERE " . implode(" AND ", $where);
        $sql = "SELECT * FROM branches {$whereClause} ORDER BY name ASC";

        return $this->findWithPagination($sql, $params, $page, $limit);
    }
}
