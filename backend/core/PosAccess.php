<?php
namespace Core;

/**
 * Odoo-style POS access-level engine.
 *
 * Odoo Retail POS gates operations on three levels:
 *
 *   MINIMAL   Ordinary selling only. Sell, scan, select customer, receive
 *             allowed payments, validate normal orders, lock/switch employee.
 *   BASIC     Adds Odoo-style operational capabilities: open register,
 *             opening control, cash in/out, refund, cancel allowed orders,
 *             create/select customers, apply allowed discounts, change price
 *             where rights permit, select pricelists.
 *   ADVANCED  Adds closing control, reconciliation, product admin, and
 *             other POS administration. Curdun-only system settings still
 *             require the ERP Admin account itself.
 *
 * The internal engine works exclusively on these levels + capability names.
 * Friendly display roles (Cashier / Senior Cashier / Store Manager / Admin)
 * remain the human-facing labels — they map to a level here.
 *
 * Dual-identity rule (see Auth::effectiveRoles):
 *   When a POS cashier is PINned in, THEIR level wins even if the underlying
 *   browser account is an ERP Admin. An Admin browsing on a shared terminal
 *   MUST NOT grant Nimco (Minimal) Advanced POS powers.
 */
final class PosAccess
{
    public const MINIMAL  = 'MINIMAL';
    public const BASIC    = 'BASIC';
    public const ADVANCED = 'ADVANCED';

    /** Role slug → Odoo access level. superadmin always ADVANCED. */
    private const ROLE_LEVEL = [
        'superadmin'     => self::ADVANCED,
        'admin'          => self::ADVANCED,
        'store_manager'  => self::ADVANCED,
        'senior_cashier' => self::BASIC,
        'cashier'        => self::MINIMAL,
    ];

    /**
     * Capabilities allowed AT each level. A level inherits from lower levels.
     * Keep names stable — routes, PosService, and the JS frontend all key on
     * them. Add new caps here, never inline elsewhere.
     */
    private const CAPS = [
        self::MINIMAL => [
            // Rule #6 — ordinary selling only
            'pos.enter',
            'pos.sell',
            'pos.search_products',
            'pos.select_customer',
            'pos.order_note',
            'pos.payment_receive',
            'pos.order_validate',
            'pos.employee_switch',
            'pos.view_own_pos',
        ],
        self::BASIC => [
            // Rule #7 — standard Odoo operational rights
            'pos.register_open',
            'pos.opening_control',
            'pos.cash_in',
            'pos.cash_out',
            'pos.refund',
            'pos.cancel_order',
            'pos.customer_create',
            'pos.discount_apply',
            'pos.price_change',
            'pos.pricelist_select',
            'pos.loyalty_operate',
        ],
        self::ADVANCED => [
            // Rule #8 — POS administration
            'pos.register_close',
            'pos.closing_control',
            'pos.reconciliation',
            'pos.product_admin',
            'pos.customer_admin',
            'pos.staff_admin',
            'pos.pos_admin',
            'pos.settings',
        ],
    ];

    /** Rank so higher levels inherit lower-level capabilities. */
    private const RANK = [self::MINIMAL => 1, self::BASIC => 2, self::ADVANCED => 3];

    /**
     * The Odoo access level for the currently-acting party (POS cashier if
     * PINned in, otherwise the browser account). Returns null when no roles
     * map to any level — the caller should treat that as "no POS access".
     */
    public static function level(): ?string
    {
        $roles = Auth::effectiveRoles();
        $best = null;
        foreach ($roles as $role) {
            $lvl = self::ROLE_LEVEL[$role] ?? null;
            if (!$lvl) continue;
            if ($best === null || self::RANK[$lvl] > self::RANK[$best]) {
                $best = $lvl;
            }
        }
        return $best;
    }

    /** True when the acting party has the given capability. */
    public static function can(string $capability): bool
    {
        $level = self::level();
        if ($level === null) return false;
        $rank = self::RANK[$level];
        foreach (self::CAPS as $capLevel => $caps) {
            if (self::RANK[$capLevel] > $rank) continue;
            if (in_array($capability, $caps, true)) return true;
        }
        return false;
    }

    /**
     * Same as can(), but for authorization on the underlying ACCOUNT rather
     * than the active POS cashier. Used by back-office endpoints (product
     * catalog admin, POS settings) that Odoo binds to the ERP account, not
     * to whoever is at the terminal.
     */
    public static function accountCan(string $capability): bool
    {
        $user = Auth::user();
        $roles = (array)($user['roles'] ?? []);
        $best = null;
        foreach ($roles as $role) {
            $lvl = self::ROLE_LEVEL[$role] ?? null;
            if (!$lvl) continue;
            if ($best === null || self::RANK[$lvl] > self::RANK[$best]) {
                $best = $lvl;
            }
        }
        if ($best === null) return false;
        $rank = self::RANK[$best];
        foreach (self::CAPS as $capLevel => $caps) {
            if (self::RANK[$capLevel] > $rank) continue;
            if (in_array($capability, $caps, true)) return true;
        }
        return false;
    }

    /**
     * Snapshot for the frontend so the JS access-level model stays in
     * lockstep with the backend (Rule #16 — one source of truth).
     */
    public static function snapshot(): array
    {
        return [
            'level'          => self::level(),
            'account_level'  => self::resolveAccountLevel(),
            'role_to_level'  => self::ROLE_LEVEL,
            'capabilities'   => self::CAPS,
            'rank'           => self::RANK,
        ];
    }

    private static function resolveAccountLevel(): ?string
    {
        $user = Auth::user();
        $roles = (array)($user['roles'] ?? []);
        $best = null;
        foreach ($roles as $role) {
            $lvl = self::ROLE_LEVEL[$role] ?? null;
            if (!$lvl) continue;
            if ($best === null || self::RANK[$lvl] > self::RANK[$best]) {
                $best = $lvl;
            }
        }
        return $best;
    }
}
