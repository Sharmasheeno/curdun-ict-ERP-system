<?php

namespace App\Models;

class AuditLog extends BaseModel
{
    protected string $table = 'audit_logs';
    protected array $fillable = [
        'user_id', 
        'company_id', 
        'module', 
        'action', 
        'record_id', 
        'old_values', 
        'new_values', 
        'ip_address', 
        'user_agent'
    ];

    public function logAction(string $module, string $action, ?int $recordId = null, array $oldValues = [], array $newValues = []): int
    {
        // Typically user_id and company_id would be retrieved from auth context, 
        // but here we just pass nulls or rely on the caller to provide them via create() if needed.
        // For this helper method, we just insert what's provided.
        $data = [
            'module' => $module,
            'action' => $action,
            'record_id' => $recordId,
            'old_values' => !empty($oldValues) ? json_encode($oldValues) : null,
            'new_values' => !empty($newValues) ? json_encode($newValues) : null,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null
        ];

        return $this->create($data);
    }
}
