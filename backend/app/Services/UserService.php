<?php

namespace App\Services;

use App\Repositories\UserRepository;
use App\Repositories\RoleRepository;
use App\Repositories\AuditLogRepository;
use Core\Validator;
use Exception;

class UserService
{
    public function __construct(
        private UserRepository $userRepository,
        private RoleRepository $roleRepository,
        private AuditLogRepository $auditLogRepository,
        private Validator $validator
    ) {}

    public function getAll(array $filters): array
    {
        return $this->userRepository->getAllPaginated($filters);
    }

    public function getById(int $id): array
    {
        $user = $this->userRepository->findById($id);
        if (!$user) {
            throw new Exception('User not found.', 404);
        }
        return $user;
    }

    public function create(array $data): array
    {
        $this->validator->validate($data, [
            'name' => 'required',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min_length:8'
        ]);

        $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        
        $roles = $data['roles'] ?? [];
        unset($data['roles']);

        $userId = $this->userRepository->create($data);
        
        if (!empty($roles)) {
            $this->userRepository->syncRoles($userId, $roles);
        }

        $this->auditLogRepository->create([
            'module' => 'USER',
            'action' => 'CREATE',
            'record_id' => $userId,
            'new_values' => json_encode(['email' => $data['email'], 'name' => $data['name']]),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $this->getById($userId);
    }

    public function update(int $id, array $data): array
    {
        $oldUser = $this->getById($id);
        
        $this->validator->validate($data, [
            'name' => 'required',
            'email' => "required|email|unique:users,email,{$id}"
        ]);

        if (isset($data['password'])) {
            if (strlen($data['password']) < 8) {
                throw new Exception('Password must be at least 8 characters long.', 400);
            }
            $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }

        $roles = $data['roles'] ?? null;
        unset($data['roles']);

        $this->userRepository->update($id, $data);

        if ($roles !== null) {
            $this->userRepository->syncRoles($id, $roles);
        }

        $newUser = $this->getById($id);

        $this->auditLogRepository->create([
            'module' => 'USER',
            'action' => 'UPDATE',
            'record_id' => $id,
            'old_values' => json_encode(['email' => $oldUser['email'], 'name' => $oldUser['name']]),
            'new_values' => json_encode(['email' => $newUser['email'], 'name' => $newUser['name']]),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $newUser;
    }

    public function delete(int $id): bool
    {
        $user = $this->getById($id);
        
        $this->userRepository->softDelete($id);
        
        $this->auditLogRepository->create([
            'module' => 'USER',
            'action' => 'DELETE',
            'record_id' => $id,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return true;
    }

    public function assignRoles(int $userId, array $roleIds): void
    {
        $this->getById($userId); // verify exists
        
        $this->userRepository->syncRoles($userId, $roleIds);
        
        $this->auditLogRepository->create([
            'module' => 'USER',
            'action' => 'ROLE_CHANGE',
            'record_id' => $userId,
            'new_values' => json_encode(['roles' => $roleIds]),
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }

    public function changePassword(int $userId, string $currentPassword, string $newPassword): void
    {
        $user = $this->getById($userId);
        
        if (!password_verify($currentPassword, $user['password'])) {
            throw new Exception('Current password is incorrect.', 400);
        }
        
        if (strlen($newPassword) < 8) {
            throw new Exception('New password must be at least 8 characters long.', 400);
        }
        
        $this->userRepository->update($userId, [
            'password' => password_hash($newPassword, PASSWORD_DEFAULT)
        ]);
        
        $this->auditLogRepository->create([
            'module' => 'USER',
            'action' => 'PASSWORD_CHANGE',
            'record_id' => $userId,
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }
}
