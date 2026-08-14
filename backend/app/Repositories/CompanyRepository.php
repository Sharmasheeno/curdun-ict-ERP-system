<?php

namespace App\Repositories;

class CompanyRepository extends BaseRepository
{
    protected string $table = 'companies';
    protected bool   $softDelete = true;
    protected array  $fillable = [
        'name', 'email', 'phone', 'address', 'city', 'country', 'logo', 'status',
    ];

    public function findAll(array $filters = [], int $page = 1, int $limit = 20): array
    {
        $params = [];
        $where = [];

        if (!empty($filters['search'])) {
            $searchCond = $this->buildSearchCondition($filters['search'], ['name', 'email'], $params);
            if ($searchCond) $where[] = $searchCond;
        }

        $whereClause = empty($where) ? "" : "WHERE " . implode(" AND ", $where);
        $sql = "SELECT * FROM companies {$whereClause} ORDER BY name ASC";

        return $this->findWithPagination($sql, $params, $page, $limit);
    }

    public function findWithBranches(int $companyId): mixed
    {
        $company = $this->db->query("SELECT * FROM companies WHERE id = :id", ['id' => $companyId])->fetch();
        if (!$company) return null;

        $company['branches'] = $this->db->query(
            "SELECT * FROM branches WHERE company_id = :id ORDER BY name ASC", 
            ['id' => $companyId]
        )->fetchAll();

        $company['departments'] = $this->db->query(
            "SELECT * FROM departments WHERE company_id = :id ORDER BY name ASC", 
            ['id' => $companyId]
        )->fetchAll();

        return $company;
    }
}
