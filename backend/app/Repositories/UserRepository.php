<?php

namespace App\Repositories;

class UserRepository extends BaseRepository
{
    protected string $table = 'users';
    protected bool   $softDelete = true;
    protected array  $fillable = [
        'company_id','branch_id','department_id',
        'name','email','phone','avatar','password','pin_hash','status',
        // Auth-flow columns (login rate limit, lockout, last-login tracking)
        'login_attempts','locked_until','last_login_at','last_login_ip',
        'pin_last_used_at','email_verified_at','must_change_password',
    ];

    public function storePasswordReset(string $email, string $token, string $expires, string $channel = 'email', ?string $otpHash = null): int
    {
        $this->db->query(
            "UPDATE password_resets SET used_at=NOW() WHERE email=:email AND used_at IS NULL",
            ['email' => $email]
        );
        return (int)$this->db->query(
            "INSERT INTO password_resets (email,token,channel,otp_hash,attempts,expires_at,created_at)
             VALUES (:email,:token,:channel,:otp_hash,0,:expires,NOW())",
            ['email'=>$email,'token'=>$token,'channel'=>$channel,'otp_hash'=>$otpHash,'expires'=>$expires]
        )->rowCount();
    }

    public function verifyPasswordResetOtp(string $email, string $otp): ?string
    {
        $reset = $this->db->query(
            "SELECT * FROM password_resets
             WHERE email=:email AND channel='sms' AND used_at IS NULL
             ORDER BY id DESC LIMIT 1",
            ['email' => strtolower(trim($email))]
        )->fetch();
        if (!$reset || strtotime((string)$reset['expires_at']) < time() || (int)$reset['attempts'] >= 5) return null;
        if (!password_verify($otp, (string)($reset['otp_hash'] ?? ''))) {
            $this->db->query("UPDATE password_resets SET attempts=attempts+1 WHERE id=:id", ['id'=>$reset['id']]);
            return null;
        }
        return (string)$reset['token'];
    }

    public function findPasswordResetByToken(string $token): ?array
    {
        $row = $this->db->query(
            "SELECT * FROM password_resets WHERE token = :t ORDER BY id DESC LIMIT 1",
            ['t' => $token]
        )->fetch();
        return $row ?: null;
    }

    public function markPasswordResetAsUsed(string $token): void
    {
        $this->db->query(
            "UPDATE password_resets SET used_at = NOW() WHERE token = :t",
            ['t' => $token]
        );
    }

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
    public function findPinCandidatesByBranch(?int $branchId, ?int $userId = null): array
    {
        $where = "status = 'active' AND pin_hash IS NOT NULL AND deleted_at IS NULL";
        $params = [];
        if ($branchId !== null) {
            $where .= " AND branch_id = :branch_id";
            $params['branch_id'] = $branchId;
        }
        if ($userId !== null) {
            $where .= " AND id = :user_id";
            $params['user_id'] = $userId;
        }
        return $this->db->query(
            "SELECT id, name, email, branch_id, company_id, pin_hash, status FROM users WHERE {$where}",
            $params
        )->fetchAll();
    }

    /**
     * Load active users with a PIN AND a Manager+ role (Store Manager, Admin,
     * superadmin). Used by AuthService::verifyManagerPin() so the calling
     * code can bcrypt-verify a PIN belongs to someone with approval rights.
     */
    public function findManagerPinCandidates(?int $branchId): array
    {
        $where = "u.status = 'active' AND u.pin_hash IS NOT NULL AND u.deleted_at IS NULL
                  AND r.name IN ('store_manager','admin','superadmin')";
        $params = [];
        if ($branchId !== null) {
            $where .= " AND u.branch_id = :branch_id";
            $params['branch_id'] = $branchId;
        }
        return $this->db->query(
            "SELECT DISTINCT u.id, u.name, u.email, u.branch_id, u.company_id, u.pin_hash,
                    r.name AS role_name
             FROM users u
             JOIN user_roles ur ON ur.user_id = u.id
             JOIN roles r       ON r.id       = ur.role_id
             WHERE {$where}",
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

    public function getAuthContext(int $userId): ?array
    {
        $user = $this->db->query(
            "SELECT u.id, u.company_id, u.branch_id, u.department_id, u.name, u.email,
                    u.phone, u.status, u.must_change_password, u.last_login_at,(u.pin_hash IS NOT NULL) has_pin,
                    c.name AS company_name, b.name AS branch_name
             FROM users u
             LEFT JOIN companies c ON c.id = u.company_id
             LEFT JOIN branches b ON b.id = u.branch_id
             WHERE u.id = :id AND u.deleted_at IS NULL LIMIT 1",
            ['id' => $userId]
        )->fetch();
        if (!$user) return null;

        $user['roles'] = array_column($this->getUserRoles($userId), 'name');
        $user['permissions'] = $this->getUserPermissions($userId);
        $user['must_change_password'] = (bool)($user['must_change_password'] ?? false);
        return $user;
    }

    // update() is provided by BaseRepository using $table + $fillable. The
    // whitelist above lets AuthService pass arbitrary user-mutation fields
    // (last_login_at, login_attempts, locked_until, password) through.

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
