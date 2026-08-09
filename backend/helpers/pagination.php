<?php

use Core\Request;

if (!function_exists('get_pagination_params')) {
    function get_pagination_params(Request $request): array {
        $page = (int) $request->get('page', 1);
        $limit = (int) $request->get('limit', 20);
        
        if ($page < 1) $page = 1;
        if ($limit < 1) $limit = 20;
        if ($limit > 100) $limit = 100;
        
        $offset = ($page - 1) * $limit;
        
        return [
            'page' => $page,
            'limit' => $limit,
            'offset' => $offset
        ];
    }
}

if (!function_exists('build_pagination_meta')) {
    function build_pagination_meta(int $page, int $limit, int $total): array {
        $pages = $total > 0 ? (int) ceil($total / $limit) : 1;
        return [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' => $pages,
            'has_next' => $page < $pages,
            'has_prev' => $page > 1
        ];
    }
}

if (!function_exists('apply_search_filter')) {
    function apply_search_filter(string &$sql, array &$params, string $search, array $columns): void {
        $search = trim($search);
        if ($search === '' || empty($columns)) {
            return;
        }
        
        $searchTerms = '%' . $search . '%';
        $clauses = [];
        foreach ($columns as $index => $column) {
            $paramName = 'search_' . $index;
            $clauses[] = "{$column} LIKE :{$paramName}";
            $params[$paramName] = $searchTerms;
        }
        
        $whereClause = '(' . implode(' OR ', $clauses) . ')';
        
        if (stripos($sql, 'WHERE') !== false) {
            $sql .= " AND {$whereClause}";
        } else {
            $sql .= " WHERE {$whereClause}";
        }
    }
}

if (!function_exists('apply_sort')) {
    function apply_sort(string &$sql, string $sort, string $order, array $allowedColumns): void {
        $sort = trim($sort);
        $order = strtoupper(trim($order)) === 'DESC' ? 'DESC' : 'ASC';
        
        if ($sort === '' || !in_array($sort, $allowedColumns, true)) {
            return;
        }
        
        $sql .= " ORDER BY {$sort} {$order}";
    }
}
