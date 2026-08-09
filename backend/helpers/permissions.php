<?php

use Core\Auth;
use Core\Exceptions\AuthenticationException;
use Core\Exceptions\AuthorizationException;

if (!function_exists('user_has_permission')) {
    function user_has_permission(string $permission): bool {
        return Auth::can($permission);
    }
}

if (!function_exists('user_has_role')) {
    function user_has_role(string $role): bool {
        return Auth::hasRole($role);
    }
}

if (!function_exists('require_permission')) {
    function require_permission(string $permission): void {
        if (!Auth::can($permission)) {
            throw new AuthorizationException("Missing required permission: {$permission}");
        }
    }
}

if (!function_exists('require_role')) {
    function require_role(string $role): void {
        if (!Auth::hasRole($role)) {
            throw new AuthorizationException("Missing required role: {$role}");
        }
    }
}

if (!function_exists('require_auth')) {
    function require_auth(): void {
        if (!Auth::check()) {
            throw new AuthenticationException("Unauthenticated");
        }
    }
}
