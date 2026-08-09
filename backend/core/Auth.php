<?php
namespace Core;

class Auth {
    public static function login(array $user): void {
        Session::regenerate();
        Session::set('user', $user);
    }

    public static function logout(): void {
        Session::destroy();
    }

    public static function check(): bool {
        return Session::has('user');
    }

    public static function user(): ?array {
        return Session::get('user');
    }

    public static function id(): mixed {
        $user = self::user();
        return $user['id'] ?? null;
    }

    public static function hasRole(string $role): bool {
        $user = self::user();
        if (!$user || !isset($user['roles'])) {
            return false;
        }
        return in_array($role, (array)$user['roles'], true);
    }

    public static function hasPermission(string $permission): bool {
        $user = self::user();
        if (!$user || !isset($user['permissions'])) {
            return false;
        }
        return in_array($permission, (array)$user['permissions'], true);
    }

    public static function can(string $permission): bool {
        return self::hasPermission($permission);
    }
}
