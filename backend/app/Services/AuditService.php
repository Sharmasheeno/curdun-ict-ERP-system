<?php

namespace App\Services;

use App\Repositories\AuditLogRepository;
use Core\Session;

class AuditService
{
    public function __construct(
        private AuditLogRepository $auditLogRepository,
        private Session $session
    ) {}

    public function getAll(array $filters = []): array
    {
        return $this->auditLogRepository->getAllPaginated($filters);
    }

    public function log(string $module, string $action, ?int $recordId = null, array $oldValues = [], array $newValues = []): void
    {
        $user = $this->session->get('user');
        
        $this->auditLogRepository->create([
            'user_id' => $user['id'] ?? null,
            'module' => $module,
            'action' => $action,
            'record_id' => $recordId,
            'old_values' => !empty($oldValues) ? json_encode($oldValues) : null,
            'new_values' => !empty($newValues) ? json_encode($newValues) : null,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }
}
