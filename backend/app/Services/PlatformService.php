<?php

namespace App\Services;

use App\Repositories\AuditLogRepository;
use App\Repositories\CompanyRepository;
use App\Repositories\RoleRepository;
use App\Repositories\UserRepository;
use Core\Auth;
use Core\Database;
use Exception;

class PlatformService
{
    public function __construct(
        private Database $db,
        private CompanyRepository $companies,
        private UserRepository $users,
        private RoleRepository $roles,
        private AuditLogRepository $audit,
        private DeliveryService $delivery
    ) {}

    private function actor(): array
    {
        $user = Auth::user();
        if (!$user) throw new Exception('Unauthenticated.', 401);
        return $user;
    }

    private function isSuperAdmin(array $user): bool
    {
        return in_array('superadmin', $user['roles'] ?? [], true);
    }

    private function requireSuperAdmin(): array
    {
        $user = $this->actor();
        if (!$this->isSuperAdmin($user)) throw new Exception('Super Admin access is required.', 403);
        return $user;
    }

    private function requireUserManager(): array
    {
        $user = $this->actor();
        if (!$this->isSuperAdmin($user) && !array_intersect($user['roles'] ?? [], ['admin','store_manager'])) {
            throw new Exception('User management requires Company Admin or Store Manager access.', 403);
        }
        return $user;
    }

    private function assertTargetManageable(array $actor, array $target): void
    {
        if ($this->isSuperAdmin($actor)) return;
        if ((int)$target['company_id'] !== (int)$actor['company_id']) throw new Exception('Forbidden.', 403);
        if (array_intersect($target['roles'] ?? [], ['superadmin','admin'])) {
            throw new Exception('Only a Curdun Super Admin can change a company administrator.', 403);
        }
    }

    private function activeSuperAdminCount(): int
    {
        return (int)$this->db->query(
            "SELECT COUNT(DISTINCT u.id)
             FROM users u
             JOIN user_roles ur ON ur.user_id=u.id
             JOIN roles r ON r.id=ur.role_id
             WHERE r.name='superadmin' AND u.status='active' AND u.deleted_at IS NULL"
        )->fetchColumn();
    }

    private function protectSuperAdminMutation(array $actor, array $target, array $data): void
    {
        if (!$this->isSuperAdmin($target)) return;
        if (!$this->isSuperAdmin($actor)) throw new Exception('Super Admin access is required.', 403);

        $isSelf = (int)$actor['id'] === (int)$target['id'];
        $removesActiveAccess =
            (isset($data['status']) && $data['status'] !== 'active') ||
            (isset($data['role']) && strtolower((string)$data['role']) !== 'superadmin');

        if ($isSelf && $removesActiveAccess) {
            throw new Exception('You cannot suspend or remove your own Super Admin access.', 409);
        }
        if (($target['status'] ?? '') === 'active' && $removesActiveAccess && $this->activeSuperAdminCount() <= 1) {
            throw new Exception('At least one active Super Admin must remain.', 409);
        }
    }

    public function overview(): array
    {
        $this->requireSuperAdmin();
        return [
            'companies' => (int)$this->db->query("SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL")->fetchColumn(),
            'active_companies' => (int)$this->db->query("SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL AND status='active'")->fetchColumn(),
            'users' => (int)$this->db->query("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL")->fetchColumn(),
            'pos_companies' => (int)$this->db->query("SELECT COUNT(*) FROM company_modules WHERE module_key='pos' AND status='active'")->fetchColumn(),
            'today_sales' => (float)($this->db->query("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE status='COMPLETED' AND order_date=CURDATE()")->fetchColumn() ?: 0),
        ];
    }

    public function companies(array $filters = []): array
    {
        $this->requireSuperAdmin();
        $params = [];
        $where = ['c.deleted_at IS NULL'];
        if (!empty($filters['search'])) {
            $where[] = '(c.name LIKE :search OR c.email LIKE :search OR c.city LIKE :search)';
            $params['search'] = '%' . $filters['search'] . '%';
        }
        return $this->db->query(
            "SELECT c.*,
                    COUNT(DISTINCT u.id) AS user_count,
                    MAX(CASE WHEN r.name='admin' THEN u.name END) AS admin_name,
                    MAX(CASE WHEN r.name='admin' THEN u.email END) AS admin_email,
                    MAX(CASE WHEN r.name='admin' THEN u.id END) AS admin_id,
                    MAX(CASE WHEN r.name='admin' THEN u.status END) AS admin_status,
                    MAX(CASE WHEN r.name='admin' THEN u.phone END) AS admin_phone,
                    MAX(CASE WHEN r.name='admin' THEN u.must_change_password END) AS admin_must_change_password,
                    MAX(CASE WHEN r.name='admin' THEN u.last_login_at END) AS admin_last_login_at,
                    (SELECT dl.channel FROM delivery_logs dl WHERE dl.company_id=c.id AND dl.purpose IN ('company_invitation','user_invitation','password_reset') ORDER BY dl.id DESC LIMIT 1) AS admin_delivery_channel,
                    (SELECT dl.status FROM delivery_logs dl WHERE dl.company_id=c.id AND dl.purpose IN ('company_invitation','user_invitation','password_reset') ORDER BY dl.id DESC LIMIT 1) AS admin_delivery_status,
                    (SELECT dl.created_at FROM delivery_logs dl WHERE dl.company_id=c.id AND dl.purpose IN ('company_invitation','user_invitation','password_reset') ORDER BY dl.id DESC LIMIT 1) AS admin_delivery_at,
                    MAX(CASE WHEN cm.module_key='pos' AND cm.status='active' THEN 1 ELSE 0 END) AS pos_enabled
             FROM companies c
             LEFT JOIN users u ON u.company_id=c.id AND u.deleted_at IS NULL
             LEFT JOIN user_roles ur ON ur.user_id=u.id
             LEFT JOIN roles r ON r.id=ur.role_id
             LEFT JOIN company_modules cm ON cm.company_id=c.id
             WHERE " . implode(' AND ', $where) . "
             GROUP BY c.id ORDER BY c.created_at DESC",
            $params
        )->fetchAll();
    }

    public function createCompany(array $data): array
    {
        $actor = $this->requireSuperAdmin();
        $name = trim((string)($data['name'] ?? ''));
        $adminName = trim((string)($data['admin_name'] ?? $data['owner'] ?? ''));
        $adminEmail = strtolower(trim((string)($data['admin_email'] ?? $data['email'] ?? '')));
        if ($name === '' || $adminName === '' || !filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Company name, admin name, and a valid admin email are required.', 422);
        }
        if ($this->users->findByEmail($adminEmail)) throw new Exception('That admin email is already in use.', 409);

        $temporaryPassword = $this->temporaryPassword();
        $this->db->beginTransaction();
        try {
            $companyId = $this->companies->create([
                'name' => $name,
                'email' => $data['company_email'] ?? null,
                'phone' => $data['phone'] ?? null,
                'address' => $data['address'] ?? null,
                'city' => $data['city'] ?? 'Mogadishu',
                'country' => $data['country'] ?? 'Somalia',
                'status' => $data['status'] ?? 'active',
            ]);
            $branchName = trim((string)($data['branch_name'] ?? 'Main Store')) ?: 'Main Store';
            $this->db->query(
                "INSERT INTO branches (company_id,name,status) VALUES (:company_id,:name,'active')",
                ['company_id' => $companyId, 'name' => $branchName]
            );
            $branchId = (int)$this->db->lastInsertId();
            $this->db->query(
                "INSERT INTO company_modules (company_id,module_key,status,starts_at) VALUES (:company_id,'pos','active',CURDATE())",
                ['company_id' => $companyId]
            );
            $userId = $this->users->create([
                'company_id' => $companyId,
                'branch_id' => $branchId,
                'name' => $adminName,
                'email' => $adminEmail,
                'phone' => $data['admin_phone'] ?? $data['phone'] ?? null,
                'password' => password_hash($temporaryPassword, PASSWORD_DEFAULT),
                'must_change_password' => 1,
                'status' => 'active',
            ]);
            $adminRole = $this->roles->findByName('admin');
            if (!$adminRole) throw new Exception('Admin role is not configured.', 500);
            $this->users->assignRole($userId, (int)$adminRole['id']);
            $this->audit->create([
                'user_id' => $actor['id'], 'company_id' => $companyId,
                'module' => 'PLATFORM', 'action' => 'COMPANY_CREATE', 'record_id' => $companyId,
                'new_values' => ['name' => $name, 'admin_email' => $adminEmail, 'module' => 'pos'],
                'created_at' => date('Y-m-d H:i:s'),
            ]);
            $this->db->commit();
        } catch (\Throwable $e) {
            if ($this->db->getConnection()->inTransaction()) $this->db->rollback();
            throw $e;
        }
        $admin = $this->users->getAuthContext($userId);
        $channel = strtolower((string)($data['delivery_channel'] ?? 'email'));
        if (!in_array($channel, ['email','sms'], true)) $channel = 'email';
        $delivery = $this->delivery->sendTemporaryCredential($admin, $temporaryPassword, $channel);
        $this->recordDelivery($admin, 'company_invitation', $delivery);
        return [
            'company' => $this->companies->findById($companyId),
            'admin' => $admin,
            'temporary_password' => $temporaryPassword,
            'delivery' => $delivery,
            'module' => 'pos',
        ];
    }

    public function updateCompany(int $id, array $data): array
    {
        $actor = $this->requireSuperAdmin();
        $company = $this->companies->findById($id);
        if (!$company) throw new Exception('Company not found.', 404);
        $this->companies->update($id, $data);
        if (array_key_exists('pos_enabled', $data)) {
            $status = $data['pos_enabled'] ? 'active' : 'inactive';
            $this->db->query(
                "INSERT INTO company_modules (company_id,module_key,status,starts_at) VALUES (:id,'pos',:status,CURDATE())
                 ON DUPLICATE KEY UPDATE status=VALUES(status)",
                ['id' => $id, 'status' => $status]
            );
        }
        $this->audit->create([
            'user_id' => $actor['id'], 'company_id' => $id, 'module' => 'PLATFORM',
            'action' => 'COMPANY_UPDATE', 'record_id' => $id, 'new_values' => $data,
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        return $this->companies->findById($id);
    }

    public function deleteCompany(int $id): void
    {
        $actor = $this->requireSuperAdmin();
        if ($id === (int)($actor['company_id'] ?? 0)) throw new Exception('You cannot remove your own company.', 409);
        $this->companies->softDelete($id);
        $this->db->query("UPDATE users SET status='inactive' WHERE company_id=:id", ['id' => $id]);
        $this->audit->create([
            'user_id' => $actor['id'], 'company_id' => $id, 'module' => 'PLATFORM',
            'action' => 'COMPANY_DELETE', 'record_id' => $id, 'created_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function users(array $filters = []): array
    {
        $actor = $this->requireUserManager();
        $params = [];
        $where = ['u.deleted_at IS NULL'];
        if (!$this->isSuperAdmin($actor)) {
            $where[] = 'u.company_id=:company_id';
            $params['company_id'] = $actor['company_id'];
        } elseif (!empty($filters['company_id'])) {
            $where[] = 'u.company_id=:company_id';
            $params['company_id'] = (int)$filters['company_id'];
        }
        if (!empty($filters['search'])) {
            $where[] = '(u.name LIKE :search OR u.email LIKE :search)';
            $params['search'] = '%' . $filters['search'] . '%';
        }
        return $this->db->query(
            "SELECT u.id,u.company_id,u.branch_id,u.name,u.email,u.phone,u.status,u.must_change_password,u.created_at,
                    u.last_login_at,(u.pin_hash IS NOT NULL) has_pin,c.name company_name,b.name branch_name,GROUP_CONCAT(DISTINCT r.name) roles
             FROM users u
             LEFT JOIN companies c ON c.id=u.company_id
             LEFT JOIN branches b ON b.id=u.branch_id
             LEFT JOIN user_roles ur ON ur.user_id=u.id
             LEFT JOIN roles r ON r.id=ur.role_id
             WHERE " . implode(' AND ', $where) . " GROUP BY u.id ORDER BY u.created_at DESC",
            $params
        )->fetchAll();
    }

    public function createUser(array $data): array
    {
        $actor = $this->requireUserManager();
        $companyId = $this->isSuperAdmin($actor) ? (int)($data['company_id'] ?? 0) : (int)$actor['company_id'];
        if ($companyId <= 0) throw new Exception('A company is required.', 422);
        $company = $this->companies->findById($companyId);
        if (!$company || ($company['status'] ?? '') !== 'active') throw new Exception('The selected company is not active.', 422);
        if (!$this->isSuperAdmin($actor)) {
            $subscription = $this->db->query("SELECT status FROM company_modules WHERE company_id=:company AND module_key='pos'", ['company'=>$companyId])->fetch();
            if (!$subscription || $subscription['status'] !== 'active') throw new Exception('Retail POS subscription is not active.', 403);
        }
        $name = trim((string)($data['name'] ?? ''));
        $email = strtolower(trim((string)($data['email'] ?? '')));
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new Exception('Name and a valid email are required.', 422);
        if ($this->users->findByEmail($email)) throw new Exception('That email is already in use.', 409);
        $roleName = strtolower((string)($data['role'] ?? 'cashier'));
        $allowed = $this->isSuperAdmin($actor)
            ? ['superadmin','admin','store_manager','senior_cashier','cashier']
            : ['store_manager','senior_cashier','cashier'];
        if (!in_array($roleName, $allowed, true)) throw new Exception('You cannot assign that role.', 403);
        $role = $this->roles->findByName($roleName);
        if (!$role) throw new Exception('Role is not configured.', 422);
        $password = (string)($data['password'] ?? $this->temporaryPassword());
        $pin = isset($data['pin']) ? trim((string)$data['pin']) : '';
        if ($pin !== '' && !preg_match('/^\d{4}$/', $pin)) throw new Exception('PIN must contain exactly 4 digits.', 422);
        $pin = $pin !== '' ? $pin : null;
        $status = (string)($data['status'] ?? 'active');
        if (!in_array($status, ['active','inactive','suspended'], true)) throw new Exception('Invalid user status.', 422);
        if (!empty($data['delivery_channel']) && !in_array(strtolower((string)$data['delivery_channel']), ['email','sms'], true)) {
            throw new Exception('Delivery channel must be email or SMS.', 422);
        }
        $branchId = !empty($data['branch_id']) ? (int)$data['branch_id'] : null;
        if ($branchId) {
            $validBranch = $this->db->query("SELECT id FROM branches WHERE id=:id AND company_id=:company", ['id'=>$branchId,'company'=>$companyId])->fetch();
            if (!$validBranch) throw new Exception('Invalid branch for this company.', 422);
        }
        $userId = $this->users->create([
            'company_id' => $companyId, 'branch_id' => $branchId, 'name' => $name,
            'email' => $email, 'phone' => $data['phone'] ?? null,
            'password' => password_hash($password, PASSWORD_DEFAULT),
            'pin_hash' => $pin ? password_hash($pin, PASSWORD_DEFAULT) : null,
            'must_change_password' => 1, 'status' => $status,
        ]);
        $this->users->assignRole($userId, (int)$role['id']);
        $this->audit->create([
            'user_id'=>$actor['id'],'company_id'=>$companyId,'module'=>'USERS','action'=>'CREATE','record_id'=>$userId,
            'new_values'=>['email'=>$email,'role'=>$roleName],'created_at'=>date('Y-m-d H:i:s'),
        ]);
        $createdUser = $this->users->getAuthContext($userId);
        $delivery = null;
        if (!empty($data['delivery_channel'])) {
            $channel = strtolower((string)$data['delivery_channel']);
            $delivery = $this->delivery->sendTemporaryCredential($createdUser, $password, $channel);
            $this->recordDelivery($createdUser, 'user_invitation', $delivery);
        }
        return ['user'=>$createdUser,'temporary_password'=>$password,'pin'=>$pin,'delivery'=>$delivery];
    }

    public function updateUser(int $id, array $data): array
    {
        $actor = $this->requireUserManager();
        $target = $this->users->getAuthContext($id);
        if (!$target) throw new Exception('User not found.', 404);
        $this->assertTargetManageable($actor, $target);
        $this->protectSuperAdminMutation($actor, $target, $data);
        $fields = array_intersect_key($data, array_flip(['name','email','phone','status','branch_id']));
        if (isset($fields['email'])) {
            $fields['email'] = strtolower(trim((string)$fields['email']));
            if (!filter_var($fields['email'], FILTER_VALIDATE_EMAIL)) throw new Exception('A valid email is required.', 422);
            if ($this->users->checkEmailExists($fields['email'], $id)) throw new Exception('That email is already in use.', 409);
        }
        if (isset($fields['status']) && !in_array($fields['status'], ['active','inactive','suspended'], true)) throw new Exception('Invalid user status.', 422);
        if (!empty($fields['branch_id'])) {
            $validBranch = $this->db->query("SELECT id FROM branches WHERE id=:id AND company_id=:company AND deleted_at IS NULL", ['id'=>(int)$fields['branch_id'],'company'=>$target['company_id']])->fetch();
            if (!$validBranch) throw new Exception('Invalid branch for this company.', 422);
        }
        if ($fields) $this->users->update($id, $fields);
        if (!empty($data['role'])) {
            $roleName = strtolower((string)$data['role']);
            if (!$this->isSuperAdmin($actor) && !in_array($roleName, ['store_manager','senior_cashier','cashier'], true)) throw new Exception('You cannot assign that role.', 403);
            $role = $this->roles->findByName($roleName);
            if (!$role) throw new Exception('Role is not configured.', 422);
            $this->users->syncRoles($id, [(int)$role['id']]);
        }
        if (!empty($data['pin'])) {
            if (!preg_match('/^\d{4}$/', (string)$data['pin'])) throw new Exception('PIN must contain exactly 4 digits.', 422);
            $this->users->update($id, ['pin_hash'=>password_hash((string)$data['pin'], PASSWORD_DEFAULT)]);
        }
        $this->audit->create([
            'user_id'=>$actor['id'],'company_id'=>$target['company_id'],'module'=>'USERS','action'=>'UPDATE','record_id'=>$id,
            'new_values'=>array_intersect_key($data, array_flip(['name','email','phone','status','branch_id','role'])), 'created_at'=>date('Y-m-d H:i:s'),
        ]);
        return $this->users->getAuthContext($id);
    }

    public function deleteUser(int $id): void
    {
        $actor = $this->requireUserManager();
        $target = $this->users->getAuthContext($id);
        if (!$target) throw new Exception('User not found.', 404);
        $this->assertTargetManageable($actor, $target);

        if ((int)$actor['id'] === $id) {
            throw new Exception('You cannot remove your own account.', 409);
        }
        $this->protectSuperAdminMutation($actor, $target, ['status' => 'inactive']);

        $this->db->beginTransaction();
        try {
            $this->users->update($id, ['status' => 'inactive']);
            $this->users->softDelete($id);
            $this->audit->create([
                'user_id'=>$actor['id'],'company_id'=>$target['company_id'],'module'=>'USERS','action'=>'DELETE','record_id'=>$id,
                'old_values'=>['email'=>$target['email'],'roles'=>$target['roles'] ?? [],'status'=>$target['status'] ?? null],
                'created_at'=>date('Y-m-d H:i:s'),
            ]);
            $this->db->commit();
        } catch (\Throwable $e) {
            if ($this->db->getConnection()->inTransaction()) $this->db->rollback();
            throw $e;
        }
    }

    public function resetUser(int $id, array $data = []): array
    {
        $actor = $this->requireUserManager();
        $target = $this->users->getAuthContext($id);
        if (!$target) throw new Exception('User not found.', 404);
        $this->assertTargetManageable($actor, $target);
        $this->users->update($id, ['locked_until'=>null,'login_attempts'=>0]);
        $channel = strtolower((string)($data['channel'] ?? 'email'));
        if (!in_array($channel, ['email','sms'], true)) throw new Exception('Choose email or SMS OTP delivery.', 422);
        $token = bin2hex(random_bytes(32));
        $otp = $channel === 'sms' ? (string)random_int(100000, 999999) : null;
        $expiresIn = $channel === 'sms' ? 600 : 3600;
        $expiresAt = date('Y-m-d H:i:s', time()+$expiresIn);
        $this->users->storePasswordReset(
            $target['email'], $token, $expiresAt, $channel,
            $otp !== null ? password_hash($otp, PASSWORD_DEFAULT) : null
        );
        $delivery = $channel === 'sms'
            ? $this->delivery->sendResetOtp($target, $otp)
            : $this->delivery->sendResetEmail($target, $token);
        $this->recordDelivery($target, 'password_reset', $delivery);
        $this->audit->create([
            'user_id'=>$actor['id'],'company_id'=>$target['company_id'],'module'=>'USERS','action'=>'PASSWORD_RESET','record_id'=>$id,
            'new_values'=>['channel'=>$channel,'delivery_status'=>$delivery['status']],
            'created_at'=>date('Y-m-d H:i:s'),
        ]);
        return [
            'user_id'=>$id,'email'=>$target['email'],'channel'=>$channel,'delivery'=>$delivery,
            'expires_at'=>$expiresAt,
            'token'=>$delivery['status'] === 'preview' ? $token : null,
        ];
    }

    public function branches(?int $companyId = null): array
    {
        $actor = $this->actor();
        $id = $this->isSuperAdmin($actor) ? ($companyId ?: null) : (int)$actor['company_id'];
        if ($id === null) return [];
        return $this->db->query("SELECT id,company_id,name,address,phone,status FROM branches WHERE company_id=:id AND deleted_at IS NULL ORDER BY name", ['id'=>$id])->fetchAll();
    }

    private function temporaryPassword(): string
    {
        return 'Cor-' . strtoupper(substr(bin2hex(random_bytes(5)), 0, 8)) . '-26';
    }

    private function recordDelivery(array $user, string $purpose, array $delivery): void
    {
        $this->db->query(
            "INSERT INTO delivery_logs (user_id,company_id,purpose,channel,destination,status,provider_message)
             VALUES (:user_id,:company_id,:purpose,:channel,:destination,:status,:message)",
            [
                'user_id'=>$user['id'] ?? null,'company_id'=>$user['company_id'] ?? null,'purpose'=>$purpose,
                'channel'=>$delivery['channel'] ?? 'email','destination'=>$delivery['destination'] ?? 'unknown',
                'status'=>$delivery['status'] ?? 'failed','message'=>$delivery['message'] ?? null,
            ]
        );
    }
}
