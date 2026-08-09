<?php

namespace App\Models;

class User extends BaseModel
{
    protected string $table = 'users';
    protected bool $softDelete = true;
    protected array $hidden = ['password', 'pin_hash', 'login_attempts', 'locked_until'];
    protected array $fillable = [
        'company_id',
        'branch_id',
        'department_id',
        'name',
        'email',
        'phone',
        'avatar',
        'password',
        'pin_hash',
        'status'
    ];

    public function findByEmail(string $email): ?array
    {
        $sql = "SELECT * FROM {$this->table} WHERE email = :email";
        if ($this->softDelete) {
            $sql .= " AND deleted_at IS NULL";
        }
        
        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute(['email' => $email]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        // Do not hide fields here because password is required for auth
        return $row ?: null;
    }

    public function getRolesAndPermissions(int $userId): array
    {
        // Get roles
        $sqlRoles = "SELECT r.name, r.display_name 
                     FROM roles r 
                     JOIN user_roles ur ON r.id = ur.role_id 
                     WHERE ur.user_id = :user_id";
        
        $stmtRoles = $this->pdo()->prepare($sqlRoles);
        $stmtRoles->execute(['user_id' => $userId]);
        $roles = $stmtRoles->fetchAll(\PDO::FETCH_ASSOC);

        // Get permissions
        $sqlPerms = "SELECT p.name 
                     FROM permissions p
                     JOIN role_permissions rp ON p.id = rp.permission_id
                     JOIN user_roles ur ON rp.role_id = ur.role_id
                     WHERE ur.user_id = :user_id";
        
        $stmtPerms = $this->pdo()->prepare($sqlPerms);
        $stmtPerms->execute(['user_id' => $userId]);
        $permissions = $stmtPerms->fetchAll(\PDO::FETCH_COLUMN);

        return [
            'roles' => $roles,
            'permissions' => array_unique($permissions)
        ];
    }

    public function incrementLoginAttempts(int $userId): void
    {
        $sql = "UPDATE {$this->table} SET login_attempts = login_attempts + 1 WHERE id = :id";
        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute(['id' => $userId]);
    }

    public function resetLoginAttempts(int $userId): void
    {
        $sql = "UPDATE {$this->table} SET login_attempts = 0, locked_until = NULL WHERE id = :id";
        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute(['id' => $userId]);
    }

    public function updateLastLogin(int $userId, string $ip): void
    {
        $sql = "UPDATE {$this->table} SET last_login_at = NOW(), last_login_ip = :ip WHERE id = :id";
        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute(['id' => $userId, 'ip' => $ip]);
    }

    public function lockAccount(int $userId, int $minutes): void
    {
        $sql = "UPDATE {$this->table} SET locked_until = DATE_ADD(NOW(), INTERVAL :minutes MINUTE) WHERE id = :id";
        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute(['id' => $userId, 'minutes' => $minutes]);
    }
}
