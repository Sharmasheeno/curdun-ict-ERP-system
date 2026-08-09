<?php

namespace App\Middleware;

use Core\Request;
use Core\Response;
use Core\Auth;

class PermissionMiddleware
{
    private array $permissions;
    public bool $requireAll = true;

    public function __construct(string ...$permissions)
    {
        $this->permissions = $permissions;
    }

    public function handle(Request $request, callable $next)
    {
        if (!Auth::check()) {
            return Response::unauthorized('Unauthenticated');
        }

        $hasAny = false;
        foreach ($this->permissions as $permission) {
            $hasPerm = Auth::can($permission);
            if ($this->requireAll && !$hasPerm) {
                return Response::forbidden('Forbidden: Missing required permission: ' . $permission);
            }
            if ($hasPerm) {
                $hasAny = true;
            }
        }

        if (!$this->requireAll && !$hasAny && !empty($this->permissions)) {
            return Response::forbidden('Forbidden: Missing required permissions');
        }

        return $next($request);
    }
}
