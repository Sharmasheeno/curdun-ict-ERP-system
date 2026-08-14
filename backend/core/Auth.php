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

    /**
     * Currently-active POS cashier identity, or null when no cashier has
     * PINned into a POS terminal in this browser session.
     */
    public static function posCashier(): ?array {
        return Session::get('pos_cashier');
    }

    public static function id(): mixed {
        $user = self::user();
        return $user['id'] ?? null;
    }

    /**
     * ID that POS mutations attribute themselves to (orders.user_id,
     * pos_payments.user_id, stock_movements.user_id, audit_logs.user_id).
     * Prefers the active POS cashier so a sale rung on a terminal shared
     * with an Admin account is still stamped with the cashier who rang it.
     */
    public static function actingId(): mixed {
        return self::posCashier()['id'] ?? self::id();
    }

    /**
     * The role list that governs POS authorization. When a cashier has
     * PINned into the terminal, their role wins even if the underlying
     * browser account is a higher-privileged Admin — that's the whole
     * point of the dual-identity model.
     */
    public static function effectiveRoles(): array {
        $cashier = self::posCashier();
        if ($cashier && !empty($cashier['roles'])) {
            return (array)$cashier['roles'];
        }
        $user = self::user();
        return (array)($user['roles'] ?? []);
    }

    public static function hasRole(string $role): bool {
        return in_array($role, self::effectiveRoles(), true);
    }

    /**
     * Same as hasRole but never falls back to the POS cashier — used by
     * routes that authorize on the underlying account (billing, tenant
     * settings) rather than on the person currently at the register.
     */
    public static function accountHasRole(string $role): bool {
        $user = self::user();
        return in_array($role, (array)($user['roles'] ?? []), true);
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
