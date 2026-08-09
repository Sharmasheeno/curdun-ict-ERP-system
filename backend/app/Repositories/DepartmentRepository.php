<?php

namespace App\Repositories;

class DepartmentRepository extends BaseRepository
{
    public function findByCompany(int $companyId, int $branchId = 0): array
    {
        $params = ['company_id' => $companyId];
        $where = ["company_id = :company_id"];
        
        if ($branchId > 0) {
            $where[] = "branch_id = :branch_id";
            $params['branch_id'] = $branchId;
        }

        $whereClause = "WHERE " . implode(" AND ", $where);
        
        return $this->db->query("SELECT * FROM departments {$whereClause} ORDER BY name ASC", $params)->fetchAll();
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
            $searchCond = $this->buildSearchCondition($filters['search'], ['name'], $params);
            if ($searchCond) $where[] = $searchCond;
        }

        $whereClause = empty($where) ? "" : "WHERE " . implode(" AND ", $where);
        $sql = "SELECT * FROM departments {$whereClause} ORDER BY name ASC";

        return $this->findWithPagination($sql, $params, $page, $limit);
    }
}
