<?php

namespace App\Middleware;

use Core\Request;
use Core\Response;
use Core\Session;
use Core\Auth;

class AuthMiddleware
{
    public function handle(Request $request, callable $next)
    {
        if (Session::isExpired()) {
            Session::destroy();
            return Response::unauthorized('Session expired');
        }

        if (!Auth::check()) {
            return Response::unauthorized('Unauthenticated');
        }

        $user = Auth::user();
        $allowedDuringPasswordChange = [
            '/api/v1/auth/me',
            '/api/v1/auth/logout',
            '/api/v1/auth/change-password',
        ];
        if (!empty($user['must_change_password'])
            && Session::get('auth_method') !== 'pin'
            && !in_array($request->getUri(), $allowedDuringPasswordChange, true)) {
            return Response::forbidden('Change your temporary password before continuing.');
        }

        Session::updateActivity();

        return $next($request);
    }
}
