<?php

namespace App\Services;

use App\Repositories\RoleRepository;
use App\Repositories\PermissionRepository;
use App\Repositories\AuditLogRepository;
use Core\Validator;
use Exception;

class RoleService
{
    public function __construct(
        private RoleRepository $roleRepository,
        private PermissionRepository $permissionRepository,
        private AuditLogRepository $auditLogRepository,
        private Validator $validator
    ) {}

    public function getAll(): array
    {
        $roles = $this->roleRepository->getAll();
        foreach ($roles as &$role) {
            $role['permissions'] = $this->roleRepository->getRolePermissions($role['id']);
        }
        return $roles;
    }

    public function getById(int $id): array
    {
        $role = $this->roleRepository->findById($id);
        if (!$role) {
            throw new Exception('Role not found.', 404);
        }
        $role['permissions'] = $this->roleRepository->getRolePermissions($id);
        return $role;
    }

    public function create(array $data): array
    {
        $this->validator->validate($data, [
            'name' => 'required|unique:roles,name'
        ]);

        $permissions = $data['permissions'] ?? [];
        unset($data['permissions']);

        $roleId = $this->roleRepository->create($data);

        if (!empty($permissions)) {
            $this->roleRepository->syncPermissions($roleId, $permissions);
        }

        $this->auditLogRepository->create([
            'module' => 'ROLE',
            'action' => 'CREATE',
            'record_id' => $roleId,
            'new_values' => json_encode(['name' => $data['name'], 'permissions' => $permissions]),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $this->getById($roleId);
    }

    public function update(int $id, array $data): array
    {
        $oldRole = $this->getById($id);

        $this->validator->validate($data, [
            'name' => "required|unique:roles,name,{$id}"
        ]);

        $permissions = $data['permissions'] ?? null;
        unset($data['permissions']);

        $this->roleRepository->update($id, $data);

        if ($permissions !== null) {
            $this->roleRepository->syncPermissions($id, $permissions);
        }

        $newRole = $this->getById($id);

        $this->auditLogRepository->create([
            'module' => 'ROLE',
            'action' => 'UPDATE',
            'record_id' => $id,
            'old_values' => json_encode($oldRole),
            'new_values' => json_encode($newRole),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $newRole;
    }

    public function delete(int $id): bool
    {
        $role = $this->getById($id);
        if (($role['is_system'] ?? 0) == 1) {
            throw new Exception('System roles cannot be deleted.', 403);
        }

        $this->roleRepository->delete($id);

        $this->auditLogRepository->create([
            'module' => 'ROLE',
            'action' => 'DELETE',
            'record_id' => $id,
            'old_values' => json_encode($role),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return true;
    }

    public function syncPermissions(int $roleId, array $permissionIds): void
    {
        $this->getById($roleId);
        $this->roleRepository->syncPermissions($roleId, $permissionIds);

        $this->auditLogRepository->create([
            'module' => 'ROLE',
            'action' => 'SYNC_PERMISSIONS',
            'record_id' => $roleId,
            'new_values' => json_encode(['permissions' => $permissionIds]),
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }
}
