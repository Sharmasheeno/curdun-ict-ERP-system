<?php

namespace App\Repositories;

class AuditLogRepository extends BaseRepository
{
    public function findAll(array $filters = [], int $page = 1, int $limit = 50): array
    {
        $params = [];
        $where = [];

        if (!empty($filters['module'])) {
            $where[] = "a.module = :module";
            $params['module'] = $filters['module'];
        }
        
        if (!empty($filters['action'])) {
            $where[] = "a.action = :action";
            $params['action'] = $filters['action'];
        }
        
        if (!empty($filters['user_id'])) {
            $where[] = "a.user_id = :user_id";
            $params['user_id'] = $filters['user_id'];
        }

        $dateFilter = $this->buildDateFilter($filters['date_from'] ?? '', $filters['date_to'] ?? '', 'a.created_at', $params);
        if ($dateFilter) $where[] = $dateFilter;

        $whereClause = empty($where) ? "" : "WHERE " . implode(" AND ", $where);
        
        $sql = "SELECT a.*, u.name as user_name 
                FROM audit_logs a 
                LEFT JOIN users u ON a.user_id = u.id 
                {$whereClause} 
                ORDER BY a.created_at DESC";

        return $this->findWithPagination($sql, $params, $page, $limit);
    }

    /**
     * Insert an audit log row from an associative array.
     * Accepted keys: user_id, company_id, module, action, record_id,
     * ip_address, user_agent, old_values, new_values, created_at.
     * Any values that are arrays are JSON-encoded.
     */
    public function create(array $data): int
    {
        $cols = ['user_id','company_id','module','action','record_id','ip_address','user_agent','old_values','new_values','created_at'];
        $fields = [];
        $params = [];
        foreach ($cols as $c) {
            if (array_key_exists($c, $data)) {
                $v = $data[$c];
                if (is_array($v)) $v = json_encode($v);
                $fields[] = $c;
                $params[$c] = $v;
            }
        }
        if (empty($fields)) return 0;

        $placeholders = array_map(fn($f) => ":{$f}", $fields);
        $sql = "INSERT INTO audit_logs (" . implode(',', $fields) . ") VALUES (" . implode(',', $placeholders) . ")";
        $this->db->query($sql, $params);
        return (int) $this->db->lastInsertId();
    }

    public function log(?int $userId = null, ?int $companyId = null, string $module = '', string $action = '', ?int $recordId = null, array $oldValues = [], array $newValues = []): void
    {
        $sql = "INSERT INTO audit_logs (user_id, company_id, module, action, record_id, old_values, new_values) 
                VALUES (:user_id, :company_id, :module, :action, :record_id, :old_values, :new_values)";
                
        $this->db->query($sql, [
            'user_id' => $userId,
            'company_id' => $companyId,
            'module' => $module,
            'action' => $action,
            'record_id' => $recordId,
            'old_values' => empty($oldValues) ? null : json_encode($oldValues),
            'new_values' => empty($newValues) ? null : json_encode($newValues)
        ]);
    }
}
