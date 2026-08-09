<?php

namespace App\Repositories;

class UserRepository extends BaseRepository
{
    public function findAll(array $filters = [], int $page = 1, int $limit = 20): array
    {
        $params = [];
        $where = [];

        if (!empty($filters['search'])) {
            $searchCond = $this->buildSearchCondition($filters['search'], ['u.name', 'u.email'], $params);
            if ($searchCond) $where[] = $searchCond;
        }

        if (!empty($filters['status'])) {
            $statusCond = $this->buildStatusFilter($filters['status'], $params);
            if ($statusCond) $where[] = $statusCond;
        }

        $whereClause = empty($where) ? "" : "WHERE " . implode(" AND ", $where);
        
        $allowedSorts = ['name', 'email', 'created_at', 'status'];
        $sort = in_array($filters['sort'] ?? '', $allowedSorts) ? $filters['sort'] : 'created_at';
        $order = strtoupper($filters['order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

        $sql = "SELECT u.id, u.name, u.email, u.status, u.created_at, GROUP_CONCAT(r.name) as roles 
                FROM users u 
                LEFT JOIN user_roles ur ON u.id = ur.user_id 
                LEFT JOIN roles r ON ur.role_id = r.id 
                {$whereClause} 
                GROUP BY u.id 
                ORDER BY u.{$sort} {$order}";

        return $this->findWithPagination($sql, $params, $page, $limit);
    }

    public function findByEmail(string $email): mixed
    {
        return $this->db->query("SELECT * FROM users WHERE email = :email", ['email' => $email])->fetch();
    }

    /**
     * Load all active users in a branch that have a POS pin_hash set.
     * PIN sign-in caller compares provided PIN against each candidate's hash.
     * We deliberately never SELECT WHERE pin_hash = ? because bcrypt hashes are
     * salted and cannot be looked up directly.
     */
    public function findPinCandidatesByBranch(?int $branchId): array
    {
        $where = "status = 'active' AND pin_hash IS NOT NULL AND deleted_at IS NULL";
        $params = [];
        if ($branchId !== null) {
            $where .= " AND branch_id = :branch_id";
            $params['branch_id'] = $branchId;
        }
        return $this->db->query(
            "SELECT id, name, email, branch_id, company_id, pin_hash, status FROM users WHERE {$where}",
            $params
        )->fetchAll();
    }

    public function touchPinLastUsed(int $userId): void
    {
        $this->db->query(
            "UPDATE users SET pin_last_used_at = NOW() WHERE id = :id",
            ['id' => $userId]
        );
    }

    public function getUserRoles(int $userId): array
    {
        return $this->db->query(
            "SELECT r.* FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = :id",
            ['id' => $userId]
        )->fetchAll();
    }

    public function getUserPermissions(int $userId): array
    {
        return $this->db->query(
            "SELECT DISTINCT p.name FROM permissions p
             JOIN role_permissions rp ON p.id = rp.permission_id
             JOIN user_roles ur       ON rp.role_id = ur.role_id
             WHERE ur.user_id = :id",
            ['id' => $userId]
        )->fetchAll(\PDO::FETCH_COLUMN);
    }

    public function update(int $userId, array $fields): void
    {
        if (empty($fields)) return;
        $sets = [];
        $params = ['id' => $userId];
        foreach ($fields as $k => $v) {
            $sets[]      = "{$k} = :{$k}";
            $params[$k]  = $v;
        }
        $this->db->query(
            "UPDATE users SET " . implode(', ', $sets) . " WHERE id = :id",
            $params
        );
    }

    public function findWithRoles(int $userId): mixed
    {
        $user = $this->db->query("SELECT id, name, email, status FROM users WHERE id = :id", ['id' => $userId])->fetch();
        if (!$user) return null;

        $user['roles'] = $this->db->query(
            "SELECT r.* FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = :id", 
            ['id' => $userId]
        )->fetchAll();

        $user['permissions'] = $this->db->query(
            "SELECT p.name FROM permissions p 
             JOIN role_permissions rp ON p.id = rp.permission_id 
             JOIN user_roles ur ON rp.role_id = ur.role_id 
             WHERE ur.user_id = :id", 
            ['id' => $userId]
        )->fetchAll(\PDO::FETCH_COLUMN);

        return $user;
    }

    public function assignRole(int $userId, int $roleId): void
    {
        $this->db->query("INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (:user_id, :role_id)", [
            'user_id' => $userId,
            'role_id' => $roleId
        ]);
    }

    public function removeRole(int $userId, int $roleId): void
    {
        $this->db->query("DELETE FROM user_roles WHERE user_id = :user_id AND role_id = :role_id", [
            'user_id' => $userId,
            'role_id' => $roleId
        ]);
    }

    public function syncRoles(int $userId, array $roleIds): void
    {
        $this->db->beginTransaction();
        try {
            $this->db->query("DELETE FROM user_roles WHERE user_id = :user_id", ['user_id' => $userId]);
            foreach ($roleIds as $roleId) {
                $this->assignRole($userId, $roleId);
            }
            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function checkEmailExists(string $email, int $excludeId = 0): bool
    {
        $sql = "SELECT COUNT(*) FROM users WHERE email = :email AND id != :exclude_id";
        return (bool)$this->db->query($sql, ['email' => $email, 'exclude_id' => $excludeId])->fetchColumn();
    }
}
