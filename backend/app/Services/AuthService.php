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
    private DeliveryService $delivery;

    public function __construct(
        UserRepository $userRepository,
        Session $session,
        Auth $auth,
        AuditLogRepository $auditLogRepository,
        DeliveryService $delivery
    ) {
        $this->userRepository = $userRepository;
        $this->session = $session;
        $this->auth = $auth;
        $this->auditLogRepository = $auditLogRepository;
        $this->delivery = $delivery;
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
        $context = $this->userRepository->getAuthContext((int)$user['id']);
        if (!$context) {
            throw new Exception('Unable to load authenticated user.', 500);
        }

        // 9. Regenerate session
        $this->session->regenerate();

        // 10. Store in session
        $this->session->set('user', $context);
        $this->session->set('auth_method', 'password');

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
            'user' => $context,
            'roles' => $context['roles'],
            'permissions' => $context['permissions']
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
    public function pinLogin(string $pin, ?int $branchId, ?int $userId, string $ip, string $userAgent): array
    {
        if (!preg_match('/^\d{4}$/', $pin)) {
            throw new Exception('PIN must contain exactly 4 digits.', 400);
        }

        $key = "pin_login_attempts_{$ip}";
        $attempts = $this->session->get($key) ?? 0;
        $last     = $this->session->get("{$key}_last") ?? 0;
        if ($attempts >= 5 && (time() - $last) < 300) {
            throw new Exception('Too many PIN attempts. Please try again later.', 429);
        }

        if ($userId === null || $userId <= 0) {
            throw new Exception('Select a staff account before entering a PIN.', 400);
        }
        $candidates = $this->userRepository->findPinCandidatesByBranch($branchId, $userId);
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

        $context = $this->userRepository->getAuthContext((int)$matched['id']);
        if (!$context) {
            throw new Exception('Unable to load authenticated user.', 500);
        }

        // ── Dual-identity model ──────────────────────────────────────
        // A POS terminal can be shared by many cashiers throughout one
        // browser session. The account owner (Curdun user who signed in
        // with email + password) stays in session['user'] as long as they
        // exist; the currently-operating POS employee lives in a separate
        // slot session['pos_cashier'] and drives POS authorization.
        //
        // Cases:
        //   (a) No prior account session — a cashier is walking up to a
        //       shared terminal.  Both slots get set to the same context
        //       so downstream code still works when nothing else signed in.
        //   (b) An account session already exists (Ahmed = Admin) and now
        //       Nimco PINs in.  session['user'] stays as Ahmed; only
        //       session['pos_cashier'] becomes Nimco.  Backend authorization
        //       for POS endpoints uses Nimco's Cashier role — the account
        //       does NOT elevate the cashier.
        // ─────────────────────────────────────────────────────────────
        $existingUser = $this->session->get('user');
        $this->session->regenerate();
        $this->session->set('pos_cashier', $context);
        if (!$existingUser) {
            // Fresh terminal — no browser account session yet.
            $this->session->set('user', $context);
        } else {
            // Preserve the account holder.
            $this->session->set('user', $existingUser);
        }
        $this->session->set('auth_method', 'pin');

        // P12 - PIN_LOGIN captures BOTH identities (Rule #18). The row's
        // user_id stamps the cashier that logged in; new_values carries the
        // account owner alongside so the audit table shows Ahmed the Admin
        // owned the browser session when Nimco PINned in.
        $accountForAudit = $existingUser ?? null;
        $this->auditLogRepository->create([
            'user_id'    => $matched['id'],
            'module'     => 'AUTH',
            'action'     => 'PIN_LOGIN',
            'ip_address' => $ip,
            'user_agent' => $userAgent,
            'new_values' => json_encode([
                'canonical_action'   => 'PIN_LOGIN',
                'account_user_id'    => $accountForAudit['id']   ?? null,
                'account_user_name'  => $accountForAudit['name'] ?? null,
                'pos_cashier_id'     => (int)$matched['id'],
                'pos_cashier_name'   => $matched['name'] ?? null,
                'branch_id'          => $branchId,
            ]),
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return [
            'user'        => $context,
            'roles'       => $context['roles'],
            'permissions' => $context['permissions'],
        ];
    }

    /**
     * Verify a Manager+ PIN for a specific restricted POS action and mint
     * a one-time approval bound to that action + target + cashier + amount.
     * It expires in 5 minutes and can be used exactly once.
     *
     * The calling cashier's session is NOT altered — POS authorization keeps
     * running against the cashier's own role. Only the specific restricted
     * operation named in { action, target } is unblocked, and only for the
     * one attempt that presents the safe approval id. The secret token is
     * retained entirely server-side.
     *
     * Extra params (all optional beyond action):
     *   $target = ['type'=>'order','id'=>1054]
     *   $amount = 20.00
     *   $sessionId = 3
     */
    public function verifyManagerPin(
        string $pin,
        string $action,
        string $reason,
        ?int   $branchId,
        string $ip,
        ?array $target = null,
        ?float $amount = null,
        ?int   $sessionId = null
    ): array {
        if (!preg_match('/^\d{4}$/', $pin)) {
            throw new Exception('PIN must contain exactly 4 digits.', 400);
        }
        if ($reason === '') {
            throw new Exception('A reason is required for the audit log.', 400);
        }

        // Same brute-force gate the cashier PIN uses.
        $key = "mgr_approve_attempts_{$ip}";
        $attempts = $this->session->get($key) ?? 0;
        $last     = $this->session->get("{$key}_last") ?? 0;
        if ($attempts >= 5 && (time() - $last) < 300) {
            throw new Exception('Too many approval attempts. Please try again later.', 429);
        }

        $candidates = $this->userRepository->findManagerPinCandidates($branchId);
        $manager = null;
        foreach ($candidates as $u) {
            if (!empty($u['pin_hash']) && password_verify($pin, $u['pin_hash'])) {
                $manager = $u;
                break;
            }
        }

        if (!$manager) {
            $this->session->set($key, $attempts + 1);
            $this->session->set("{$key}_last", time());
            throw new Exception('That PIN does not match any Store Manager or Admin.', 401);
        }

        $this->session->remove($key);
        $this->session->remove("{$key}_last");

        // Non-mutating: no session swap. Instead we persist a one-time,
        // action-scoped approval token the caller must present when they
        // retry the restricted operation.
        // Prefer the ACTIVE POS cashier as requester (dual-identity), so
        // an Admin browser session doesn't get credited for a cashier's
        // approval request.
        $cashier = $this->session->get('pos_cashier') ?: $this->session->get('user');
        $token   = bin2hex(random_bytes(32));   // 64 hex chars
        $expires = date('Y-m-d H:i:s', time() + 300);   // 5 minutes
        $companyId = $cashier['company_id'] ?? $manager['company_id'] ?? null;

        \Core\Database::getInstance()->query(
            "INSERT INTO pos_manager_approvals
                (company_id, token, action, target_type, target_id, amount,
                 session_id, requested_by, approved_by, reason, expires_at)
             VALUES
                (:company, :token, :action, :ttype, :tid, :amount,
                 :session, :req, :appr, :reason, :expires)",
            [
                'company' => $companyId,
                'token'   => $token,
                'action'  => $action,
                'ttype'   => $target['type'] ?? null,
                'tid'     => isset($target['id']) ? (int)$target['id'] : null,
                'amount'  => $amount,
                'session' => $sessionId,
                'req'     => $cashier['id'] ?? 0,
                'appr'    => $manager['id'],
                'reason'  => $reason,
                'expires' => $expires,
            ]
        );
        $approvalId = (int)\Core\Database::getInstance()->lastInsertId();

        $this->auditLogRepository->create([
            'user_id'    => $cashier['id'] ?? null,
            'company_id' => $companyId,
            'module'     => 'POS',
            'action'     => 'MANAGER_APPROVAL',
            'record_id'  => $manager['id'],
            'ip_address' => $ip,
            'new_values' => json_encode([
                'approved_action' => $action,
                'target'          => $target,
                'amount'          => $amount,
                'session_id'      => $sessionId,
                'approved_by_id'  => $manager['id'],
                'approved_by'     => $manager['name'] ?? null,
                'requested_by_id' => $cashier['id'] ?? null,
                'requested_by'    => $cashier['name'] ?? null,
                'actor'           => [
                    'account_user_id'   => $accountForAudit ? (int)$accountForAudit['id'] : null,
                    'account_user_name' => $accountForAudit['name'] ?? null,
                    'pos_cashier_id'    => $cashier ? (int)$cashier['id'] : null,
                    'pos_cashier_name'  => $cashier['name'] ?? null,
                ],
                'reason'          => $reason,
                'approval_id'     => $approvalId,
                // P12 Rule #14 - never leak any part of the raw token.
                // approval_id below is the safe reference.
                'expires_at'      => $expires,
            ]),
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return [
            'approval' => [
                // Safe browser reference. The raw one-time token remains
                // server-side and is never returned to JavaScript.
                'approval_id'=> $approvalId,
                'action'     => $action,
                'target'     => $target,
                'amount'     => $amount,
                'session_id' => $sessionId,
                'expires_at' => $expires,
                'one_time'   => true,
            ],
            'approved_by' => [
                'id'   => (int)$manager['id'],
                'name' => $manager['name'] ?? '',
                'role' => $manager['role_name'] ?? '',
            ],
            'action' => $action,
            'reason' => $reason,
        ];
    }

    /** Consume a browser-safe approval id; the secret token never leaves PHP. */
    public function consumeApprovalId(?int $approvalId, array $constraints, string $ip): array
    {
        if (!$approvalId || $approvalId <= 0) {
            throw new Exception('Manager approval is required for this action.', 403);
        }
        $db = \Core\Database::getInstance();
        $row = $db->query("SELECT token FROM pos_manager_approvals WHERE id=:id LIMIT 1", ['id'=>$approvalId])->fetch();
        if (!$row) throw new Exception('Manager approval is not valid.', 403);
        return $this->consumeApproval($row['token'], $constraints, $ip);
    }

    /**
     * Consume a Manager-approval token. Restricted operations call this
     * on the way in — the token has to match the exact action + target
     * they're about to perform, be PENDING, and not expired. On success
     * the row flips to USED with used_at/used_ip stamped. Never used
     * more than once.
     *
     *   $constraints = ['action'=>'refund', 'target_id'=>1054, 'amount'=>20.00]
     *
     * Throws with a clear message on any mismatch (403).
     */
    public function consumeApproval(?string $token, array $constraints, string $ip): array
    {
        if (!$token) {
            throw new Exception('Manager approval token is required for this action.', 403);
        }
        $db = \Core\Database::getInstance();
        $row = $db->query(
            "SELECT * FROM pos_manager_approvals WHERE token = :token LIMIT 1",
            ['token' => $token]
        )->fetch();
        if (!$row) throw new Exception('Manager approval token is not valid.', 403);
        if ($row['status'] !== 'PENDING') {
            throw new Exception('Manager approval was already used or revoked.', 403);
        }
        if (strtotime($row['expires_at']) < time()) {
            $db->query("UPDATE pos_manager_approvals SET status='EXPIRED' WHERE id=:id",['id'=>$row['id']]);
            throw new Exception('Manager approval has expired. Ask the manager again.', 403);
        }
        // Action must match exactly.
        if (isset($constraints['action']) && $row['action'] !== $constraints['action']) {
            throw new Exception('Manager approval is for a different action.', 403);
        }
        // If the approval was scoped to a specific target, enforce it.
        if (!empty($row['target_id'])
            && isset($constraints['target_id'])
            && (int)$row['target_id'] !== (int)$constraints['target_id']) {
            throw new Exception('Manager approval is for a different record.', 403);
        }
        if (!empty($row['target_type']) && isset($constraints['target_type'])
            && $row['target_type'] !== $constraints['target_type']) {
            throw new Exception('Manager approval is for a different record type.', 403);
        }
        // Amount is exact-scoped. Increasing OR decreasing the intended
        // financial amount after approval requires a fresh manager decision.
        if ($row['amount'] !== null && isset($constraints['amount'])
            && abs(round((float)$constraints['amount'], 2) - round((float)$row['amount'], 2)) > 0.01) {
            throw new Exception('Manager approval is for a different amount.', 403);
        }
        // The approval must have been requested by the current cashier.
        $cashier = $this->session->get('pos_cashier') ?: $this->session->get('user');
        if ((int)$row['requested_by'] !== (int)($cashier['id'] ?? 0)) {
            throw new Exception('Manager approval was requested by a different cashier.', 403);
        }

        $db->query(
            "UPDATE pos_manager_approvals
             SET status='USED', used_at=NOW(), used_ip=:ip
             WHERE id=:id AND status='PENDING'",
            ['ip' => $ip, 'id' => $row['id']]
        );
        return [
            'approval_id' => (int)$row['id'],
            'approved_by' => (int)$row['approved_by'],
            'requested_by'=> (int)$row['requested_by'],
            'action'      => $row['action'],
        ];
    }

    /**
     * Audit trail for the POS Lock button. The cashier walks away from the
     * terminal — session[pos_cashier] is dropped but session[user] stays
     * so the account holder can still work in other modules.
     */
    public function auditCashierLock(int $cashierId, string $ip): void
    {
        // P12 - Canonical action is POS_LOCK; legacy CASHIER_LOCK stays on
        // the row for backwards-compat query paths.
        $account = $this->session->get('user');
        $this->auditLogRepository->create([
            'user_id'    => $cashierId,
            'module'     => 'POS',
            'action'     => 'CASHIER_LOCK',
            'ip_address' => $ip,
            'new_values' => json_encode([
                'canonical_action'   => 'POS_LOCK',
                'account_user_id'    => $account['id']   ?? null,
                'account_user_name'  => $account['name'] ?? null,
                'pos_cashier_id'     => $cashierId,
                'pos_cashier_name'   => $this->session->get('pos_cashier')['name'] ?? null,
            ]),
            'created_at' => date('Y-m-d H:i:s'),
        ]);
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

    public function forgotPassword(string $email): array
    {
        $user = $this->userRepository->findByEmail($email);
        if (!$user) {
            // Silently return token to prevent email enumeration
            return ['status'=>'accepted'];
        }

        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', time() + 3600);
        
        $this->userRepository->storePasswordReset($email, $token, $expires, 'email');
        $delivery = $this->delivery->sendResetEmail($user, $token);
        return ['status'=>'accepted','delivery'=>$delivery];
    }

    public function verifyResetOtp(string $email, string $otp): string
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^\d{6}$/', $otp)) {
            throw new Exception('Enter a valid email and 6-digit OTP.', 422);
        }
        $token = $this->userRepository->verifyPasswordResetOtp($email, $otp);
        if (!$token) throw new Exception('The OTP is invalid, expired, or has too many failed attempts.', 400);
        return $token;
    }

    public function resetPassword(string $token, string $newPassword): void
    {
        if (strlen($newPassword) < 10 || !preg_match('/[A-Z]/', $newPassword) || !preg_match('/\d/', $newPassword)) {
            throw new Exception('Password must be at least 10 characters and include an uppercase letter and a number.', 422);
        }
        $reset = $this->userRepository->findPasswordResetByToken($token);
        
        if (!$reset || strtotime($reset['expires_at']) < time() || !empty($reset['used_at'])) {
            throw new Exception('Invalid or expired password reset token.', 400);
        }
        
        $user = $this->userRepository->findByEmail($reset['email']);
        if (!$user) {
            throw new Exception('User not found.', 404);
        }
        
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $this->userRepository->update($user['id'], [
            'password' => $hashedPassword,
            'must_change_password' => 0,
        ]);
        
        $this->userRepository->markPasswordResetAsUsed($token);
        
        $this->auditLogRepository->create([
            'user_id' => $user['id'],
            'module' => 'AUTH',
            'action' => 'PASSWORD_RESET',
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }

    public function changeOwnPassword(int $userId, string $newPassword): array
    {
        if (strlen($newPassword) < 10 || !preg_match('/[A-Z]/', $newPassword) || !preg_match('/\d/', $newPassword)) {
            throw new Exception('Password must be at least 10 characters and include an uppercase letter and a number.', 422);
        }
        $this->userRepository->update($userId, [
            'password' => password_hash($newPassword, PASSWORD_DEFAULT),
            'must_change_password' => 0,
        ]);
        $context = $this->userRepository->getAuthContext($userId);
        $this->session->set('user', $context);
        $this->auditLogRepository->create([
            'user_id' => $userId,
            'company_id' => $context['company_id'] ?? null,
            'module' => 'AUTH',
            'action' => 'PASSWORD_CHANGE',
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        return $context;
    }
}
