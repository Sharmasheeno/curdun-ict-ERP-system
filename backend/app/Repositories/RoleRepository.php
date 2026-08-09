<?php

namespace App\Repositories;

class RoleRepository extends BaseRepository
{
    public function findAll(): array
    {
        return $this->db->query(
            "SELECT r.*, COUNT(rp.permission_id) as permission_count 
             FROM roles r 
             LEFT JOIN role_permissions rp ON r.id = rp.role_id 
             GROUP BY r.id 
             ORDER BY r.name ASC"
        )->fetchAll();
    }

    public function findWithPermissions(int $roleId): mixed
    {
        $role = $this->db->query("SELECT * FROM roles WHERE id = :id", ['id' => $roleId])->fetch();
        if (!$role) return null;

        $role['permissions'] = $this->db->query(
            "SELECT p.* FROM permissions p 
             JOIN role_permissions rp ON p.id = rp.permission_id 
             WHERE rp.role_id = :id", 
            ['id' => $roleId]
        )->fetchAll();

        return $role;
    }

    public function assignPermission(int $roleId, int $permissionId): void
    {
        $this->db->query("INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (:role_id, :permission_id)", [
            'role_id' => $roleId,
            'permission_id' => $permissionId
        ]);
    }

    public function syncPermissions(int $roleId, array $permissionIds): void
    {
        $this->db->beginTransaction();
        try {
            $this->db->query("DELETE FROM role_permissions WHERE role_id = :role_id", ['role_id' => $roleId]);
            foreach ($permissionIds as $permissionId) {
                $this->assignPermission($roleId, $permissionId);
            }
            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function findByName(string $name): mixed
    {
        return $this->db->query("SELECT * FROM roles WHERE name = :name", ['name' => $name])->fetch();
    }
}
