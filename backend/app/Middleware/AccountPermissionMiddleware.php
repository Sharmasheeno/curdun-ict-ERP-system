<?php

namespace App\Middleware;

use Core\Auth;
use Core\Request;
use Core\Response;

/**
 * Gate on the underlying ERP ACCOUNT's permissions (never the active POS
 * cashier). Odoo separates POS access from backend/database access — a POS
 * Advanced employee who has no database user cannot enter Staff, Settings,
 * or Payment configuration. This middleware enforces that boundary for the
 * back-office routes.
 *
 *   new AccountPermissionMiddleware('users.create')
 *   new AccountPermissionMiddleware('settings.manage')
 *
 * superadmin bypasses.
 */
class AccountPermissionMiddleware
{
    /** @var string[] permissions that must ALL be present on the ACCOUNT */
    private array $required;

    public function __construct(string ...$permissions)
    {
        $this->required = $permissions;
    }

    public function handle(Request $request, callable $next)
    {
        if (!Auth::check()) {
            return Response::unauthorized('Unauthenticated');
        }
        // superadmin always passes (matches PosAccess behaviour).
        if (Auth::accountHasRole('superadmin')) {
            return $next($request);
        }
        $user = Auth::user();
        $perms = (array)($user['permissions'] ?? []);
        foreach ($this->required as $need) {
            if (!in_array($need, $perms, true)) {
                try {
                    error_log(sprintf(
                        '[AccountPermissionMiddleware] rejected user_id=%s path=%s missing=%s',
                        $user['id'] ?? '-',
                        $_SERVER['REQUEST_URI'] ?? '',
                        $need
                    ));
                } catch (\Throwable $e) {}
                return Response::forbidden(
                    'This action requires a permission that this ERP account does not carry. '
                    . 'POS access level alone does not unlock back-office administration.'
                );
            }
        }
        return $next($request);
    }
}
