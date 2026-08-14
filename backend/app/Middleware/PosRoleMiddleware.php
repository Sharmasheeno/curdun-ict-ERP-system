<?php

namespace App\Middleware;

use Core\Auth;
use Core\Request;
use Core\Response;

/**
 * POS role gate — reject the request with 403 unless the current session
 * user carries at least one of the allowed roles.
 *
 *   new PosRoleMiddleware('admin', 'store_manager')
 *   new PosRoleMiddleware('admin', 'store_manager', 'senior_cashier')
 *
 * Applied per-route in routes/api.php so mutating POS endpoints
 * (product CRUD, staff CRUD, settings, close-session, cash-movement) can't
 * be called by a plain Cashier — even by hand-crafting a POST with a valid
 * session cookie. Frontend button-hiding is not enough; this is the real
 * enforcement layer.
 *
 * Role slug reference (matches roles.name in the DB):
 *   superadmin, admin, store_manager, senior_cashier, cashier
 */
class PosRoleMiddleware
{
    /** @var string[] role slugs that pass this gate */
    private array $allowed;

    public function __construct(string ...$allowedRoles)
    {
        $this->allowed = $allowedRoles;
    }

    public function handle(Request $request, callable $next)
    {
        if (!Auth::check()) {
            return Response::unauthorized('Unauthenticated');
        }

        // superadmin bypasses every POS role check
        if (Auth::hasRole('superadmin')) {
            return $next($request);
        }

        foreach ($this->allowed as $role) {
            if (Auth::hasRole($role)) {
                return $next($request);
            }
        }

        // Log the rejection so audit can spot probing attempts.
        // (Best-effort — never throw here.)
        try {
            $user = Auth::user() ?? [];
            error_log(sprintf(
                '[PosRoleMiddleware] rejected user_id=%s roles=%s path=%s allowed=%s',
                $user['id'] ?? '-',
                json_encode($user['roles'] ?? []),
                $_SERVER['REQUEST_URI'] ?? '',
                json_encode($this->allowed)
            ));
        } catch (\Throwable $e) {}

        return Response::forbidden(
            'Your role does not have permission for this action. '
            . 'Ask a Store Manager or Admin.'
        );
    }
}
