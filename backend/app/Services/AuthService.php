<?php

namespace App\Services;

use App\Repositories\UserRepository;
use App\Repositories\AuditLogRepository;
use Core\Session;
use Core\Auth;
use Exception;

class AuthService
{
    private UserRepository $userRepository;
    private Session $session;
    private Auth $auth;
    private AuditLogRepository $auditLogRepository;

    public function __construct(
        UserRepository $userRepository,
        Session $session,
        Auth $auth,
        AuditLogRepository $auditLogRepository
    ) {
        $this->userRepository = $userRepository;
        $this->session = $session;
        $this->auth = $auth;
        $this->auditLogRepository = $auditLogRepository;
    }

    public function login(string $email, string $password, string $ip, string $userAgent): array
    {
        // 1. Rate limit check by IP (mock logic, ideally use a rate limiter service)
        $attempts = $this->session->get("login_attempts_{$ip}") ?? 0;
        $lastAttempt = $this->session->get("login_last_attempt_{$ip}") ?? 0;
        
        if ($attempts >= 5 && (time() - $lastAttempt) < 300) {
            throw new Exception('Too many login attempts. Please try again later.', 429);
        }

        // 2. Find user by email
        $user = $this->userRepository->findByEmail($email);
        if (!$user) {
            $this->incrementLoginAttempts($ip);
            throw new Exception('Invalid credentials.', 401);
        }

        // 3. Check user status
        if (($user['status'] ?? 'active') !== 'active') {
            throw new Exception('Account is inactive or suspended.', 401);
        }

        // 4. Check if account is locked
        if (!empty($user['locked_until']) && strtotime($user['locked_until']) > time()) {
            $remaining = strtotime($user['locked_until']) - time();
            throw new Exception("Account is locked. Try again in {$remaining} seconds.", 401);
        }

        // 5. Verify password
        if (!password_verify($password, $user['password'])) {
            $this->incrementLoginAttempts($ip);
            $fails = ($user['login_attempts'] ?? 0) + 1;
            
            if ($fails >= 5) {
                $lockedUntil = date('Y-m-d H:i:s', time() + 900); // 15 min
                $this->userRepository->update($user['id'], [
                    'login_attempts' => 0,
                    'locked_until' => $lockedUntil
                ]);
                throw new Exception('Account locked due to too many failed attempts.', 401);
            } else {
                $this->userRepository->update($user['id'], ['login_attempts' => $fails]);
                throw new Exception('Invalid credentials.', 401);
            }
        }

        // 6. Reset login attempts
        $this->userRepository->update($user['id'], [
            'login_attempts' => 0,
            'locked_until' => null,
            'last_login_at' => date('Y-m-d H:i:s'),
            'last_login_ip' => $ip
        ]);
        
        $this->session->remove("login_attempts_{$ip}");
        $this->session->remove("login_last_attempt_{$ip}");

        // 8. Load user roles and permissions
        $roles = $this->userRepository->getUserRoles($user['id']);
        $permissions = $this->userRepository->getUserPermissions($user['id']);

        // 9. Regenerate session
        $this->session->regenerate();

        // 10. Store in session
        unset($user['password']);
        $this->session->set('user', $user);
        $this->session->set('roles', $roles);
        $this->session->set('permissions', $permissions);

        // 11. Audit log
        $this->auditLogRepository->create([
            'user_id' => $user['id'],
            'module' => 'AUTH',
            'action' => 'LOGIN',
            'ip_address' => $ip,
            'user_agent' => $userAgent,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return [
            'user' => $user,
            'roles' => $roles,
            'permissions' => $permissions
        ];
    }

    private function incrementLoginAttempts(string $ip): void
    {
        $attempts = $this->session->get("login_attempts_{$ip}") ?? 0;
        $this->session->set("login_attempts_{$ip}", $attempts + 1);
        $this->session->set("login_last_attempt_{$ip}", time());
    }

    /**
     * POS 4-digit PIN sign-in for cashier stations.
     *
     * Because bcrypt hashes are salted, we can't SELECT WHERE pin_hash = ?.
     * Instead we load the small set of active PIN-enabled users for a branch
     * (typically < 50) and password_verify() against each candidate.
     *
     * Rate limits per IP (5 attempts / 5 min) the same way email login does.
     */
    public function pinLogin(string $pin, ?int $branchId, string $ip, string $userAgent): array
    {
        if (!preg_match('/^\d{4,8}$/', $pin)) {
            throw new Exception('PIN must be 4-8 digits.', 400);
        }

        $key = "pin_login_attempts_{$ip}";
        $attempts = $this->session->get($key) ?? 0;
        $last     = $this->session->get("{$key}_last") ?? 0;
        if ($attempts >= 5 && (time() - $last) < 300) {
            throw new Exception('Too many PIN attempts. Please try again later.', 429);
        }

        $candidates = $this->userRepository->findPinCandidatesByBranch($branchId);
        $matched = null;
        foreach ($candidates as $u) {
            if (!empty($u['pin_hash']) && password_verify($pin, $u['pin_hash'])) {
                $matched = $u;
                break;
            }
        }

        if (!$matched) {
            $this->session->set($key, $attempts + 1);
            $this->session->set("{$key}_last", time());
            throw new Exception('PIN is incorrect.', 401);
        }

        // Success — clear rate limit, refresh session, load roles/permissions.
        $this->session->remove($key);
        $this->session->remove("{$key}_last");

        $this->userRepository->touchPinLastUsed((int)$matched['id']);
        $this->userRepository->update((int)$matched['id'], [
            'last_login_at' => date('Y-m-d H:i:s'),
            'last_login_ip' => $ip,
        ]);

        $roles       = $this->userRepository->getUserRoles((int)$matched['id']);
        $permissions = $this->userRepository->getUserPermissions((int)$matched['id']);

        $this->session->regenerate();
        unset($matched['pin_hash']);
        $this->session->set('user', $matched);
        $this->session->set('roles', $roles);
        $this->session->set('permissions', $permissions);
        $this->session->set('auth_method', 'pin');

        $this->auditLogRepository->create([
            'user_id'    => $matched['id'],
            'module'     => 'AUTH',
            'action'     => 'PIN_LOGIN',
            'ip_address' => $ip,
            'user_agent' => $userAgent,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return [
            'user'        => $matched,
            'roles'       => $roles,
            'permissions' => $permissions,
        ];
    }

    public function logout(int $userId): void
    {
        $this->auditLogRepository->create([
            'user_id' => $userId,
            'module' => 'AUTH',
            'action' => 'LOGOUT',
            'created_at' => date('Y-m-d H:i:s')
        ]);
        $this->session->destroy();
    }

    public function me(): ?array
    {
        return $this->session->get('user');
    }

    public function forgotPassword(string $email): string
    {
        $user = $this->userRepository->findByEmail($email);
        if (!$user) {
            // Silently return token to prevent email enumeration
            return bin2hex(random_bytes(32));
        }

        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', time() + 3600);
        
        $this->userRepository->storePasswordReset($email, $token, $expires);
        
        return $token;
    }

    public function resetPassword(string $token, string $newPassword): void
    {
        $reset = $this->userRepository->findPasswordResetByToken($token);
        
        if (!$reset || strtotime($reset['expires_at']) < time() || $reset['is_used']) {
            throw new Exception('Invalid or expired password reset token.', 400);
        }
        
        $user = $this->userRepository->findByEmail($reset['email']);
        if (!$user) {
            throw new Exception('User not found.', 404);
        }
        
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $this->userRepository->update($user['id'], ['password' => $hashedPassword]);
        
        $this->userRepository->markPasswordResetAsUsed($token);
        
        $this->auditLogRepository->create([
            'user_id' => $user['id'],
            'module' => 'AUTH',
            'action' => 'PASSWORD_RESET',
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }
}
