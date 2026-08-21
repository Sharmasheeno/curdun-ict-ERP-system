<?php

namespace App\Middleware;

use Core\Auth;
use Core\PosAccess;
use Core\Request;
use Core\Response;

/**
 * Capability-based POS gate. Odoo authorises actions by access level, so we
 * route on capability names rather than role slugs.
 *
 *   new PosCapabilityMiddleware('pos.refund')
 *   new PosCapabilityMiddleware('pos.register_close')
 *
 * Superadmin still bypasses — see PosAccess::ROLE_LEVEL. The gate operates
 * against the acting party (POS cashier if PINned in, otherwise the account)
 * so an Admin browser session sharing a terminal with a Minimal cashier
 * cannot silently grant Advanced POS powers.
 */
class PosCapabilityMiddleware
{
    /** @var string[] capabilities that must ALL be present */
    private array $required;

    public function __construct(string ...$capabilities)
    {
        $this->required = $capabilities;
    }

    public function handle(Request $request, callable $next)
    {
        if (!Auth::check()) {
            return Response::unauthorized('Unauthenticated');
        }

        foreach ($this->required as $capability) {
            if (!PosAccess::can($capability)) {
                try {
                    $user = Auth::user() ?? [];
                    $cashier = Auth::posCashier();
                    error_log(sprintf(
                        '[PosCapabilityMiddleware] rejected user_id=%s cashier_id=%s level=%s path=%s missing=%s',
                        $user['id'] ?? '-',
                        $cashier['id'] ?? '-',
                        PosAccess::level() ?? '-',
                        $_SERVER['REQUEST_URI'] ?? '',
                        $capability
                    ));
                } catch (\Throwable $e) {}

                return Response::forbidden(
                    'This action requires a higher POS access level. '
                    . 'Ask an authorised employee to switch in.'
                );
            }
        }
        return $next($request);
    }
}
