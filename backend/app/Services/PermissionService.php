<?php

namespace App\Services;

use App\Repositories\PermissionRepository;
use Exception;

class PermissionService
{
    public function __construct(
        private PermissionRepository $permissionRepository
    ) {}

    public function getAll(string $module = ''): array
    {
        $permissions = $this->permissionRepository->getAll();
        
        if (!empty($module)) {
            $permissions = array_filter($permissions, fn($p) => $p['module'] === $module);
        }
        
        $grouped = [];
        foreach ($permissions as $perm) {
            $grouped[$perm['module']][] = $perm;
        }
        
        return $grouped;
    }

    public function getById(int $id): array
    {
        $permission = $this->permissionRepository->findById($id);
        if (!$permission) {
            throw new Exception('Permission not found.', 404);
        }
        return $permission;
    }
}
