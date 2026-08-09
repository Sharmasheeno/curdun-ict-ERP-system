<?php

namespace App\Repositories;

class UnitRepository extends BaseRepository
{
    public function findAll(array $filters = []): array
    {
        $params = [];
        $where = [];

        if (!empty($filters['search'])) {
            $searchCond = $this->buildSearchCondition($filters['search'], ['name', 'short_name'], $params);
            if ($searchCond) $where[] = $searchCond;
        }

        $whereClause = empty($where) ? "" : "WHERE " . implode(" AND ", $where);
        
        return $this->db->query("SELECT * FROM units {$whereClause} ORDER BY name ASC", $params)->fetchAll();
    }
}
