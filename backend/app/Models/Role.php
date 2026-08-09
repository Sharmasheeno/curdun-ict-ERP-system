<?php

namespace App\Models;

class Role extends BaseModel
{
    protected string $table = 'roles';
    protected array $fillable = ['name', 'display_name', 'description'];

    public function getPermissions(int $roleId): array
    {
        $sql = "SELECT p.name 
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = :role_id";
        
        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute(['role_id' => $roleId]);
        
        return $stmt->fetchAll(\PDO::FETCH_COLUMN);
    }
}
