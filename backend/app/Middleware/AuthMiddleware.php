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

        Session::updateActivity();

        return $next($request);
    }
}
