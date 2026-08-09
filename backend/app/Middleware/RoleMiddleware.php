<?php

namespace App\Middleware;

use Core\Request;
use Core\Response;
use Core\Auth;

class RoleMiddleware
{
    private array $roles;

    public function __construct(string ...$roles)
    {
        $this->roles = $roles;
    }

    public function handle(Request $request, callable $next)
    {
        if (!Auth::check()) {
            return Response::unauthorized('Unauthenticated');
        }

        foreach ($this->roles as $role) {
            if (Auth::hasRole($role)) {
                return $next($request);
            }
        }

        return Response::forbidden('Forbidden: Missing required role');
    }
}
