<?php

namespace App\Middleware;

use Core\Auth;
use Core\Request;
use Core\Response;

/**
 * Operational-endpoint gate for POS actions.
 *
 * Applied to routes that only make sense while a cashier is physically at
 * the terminal — checkout, refund, void, cash-movements, register close.
 * If session['pos_cashier'] is absent (nobody has PINned in, or the last
 * cashier just clicked Lock), the request is rejected with 401 even if
 * the underlying account is an Admin.
 *
 * This is the difference between:
 *
 *   Back-office     — allowed by account permission alone (Ahmed the Admin
 *                     can edit products from any browser tab).
 *   Operational POS — requires a live cashier on the terminal. A locked
 *                     POS must not be silently drivable by an Admin browser
 *                     session in another tab.
 */
class PosCashierRequiredMiddleware
{
    public function handle(Request $request, callable $next)
    {
        if (!Auth::check()) {
            return Response::unauthorized('Unauthenticated');
        }
        if (!Auth::posCashier()) {
            return Response::unauthorized(
                'POS is locked. A staff PIN is required to perform this action.'
            );
        }
        return $next($request);
    }
}
