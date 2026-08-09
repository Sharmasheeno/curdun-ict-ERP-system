<?php

namespace App\Repositories;

class CategoryRepository extends BaseRepository
{
    public function findAll(array $filters = [], int $page = 1, int $limit = 20): array
    {
        $params = [];
        $where = [];

        if (!empty($filters['search'])) {
            $searchCond = $this->buildSearchCondition($filters['search'], ['c.name'], $params);
            if ($searchCond) $where[] = $searchCond;
        }

        $whereClause = empty($where) ? "" : "WHERE " . implode(" AND ", $where);
        
        $sql = "SELECT c.*, p.name as parent_name 
                FROM categories c 
                LEFT JOIN categories p ON c.parent_id = p.id 
                {$whereClause} 
                ORDER BY c.name ASC";

        return $this->findWithPagination($sql, $params, $page, $limit);
    }

    public function getTree(int $parentId = 0): array
    {
        $sql = "SELECT * FROM categories WHERE parent_id = :parent_id ORDER BY name ASC";
        $categories = $this->db->query($sql, ['parent_id' => $parentId])->fetchAll();
        
        foreach ($categories as &$category) {
            $category['children'] = $this->getTree($category['id']);
        }
        
        return $categories;
    }
}
