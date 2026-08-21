<?php
// routes/api.php

use App\Controllers\AuthController;
use App\Controllers\PlatformController;
use App\Controllers\PosController;
use App\Middleware\AuthMiddleware;
use App\Middleware\PosCapabilityMiddleware;
use App\Middleware\PosCashierRequiredMiddleware;

$authMiddleware = new AuthMiddleware();

// ============================================================
// PUBLIC ROUTES (no auth required)
// ============================================================

$router->post('/api/v1/auth/login', [AuthController::class, 'login']);
$router->post('/api/v1/auth/pin-login', [AuthController::class, 'pinLogin']);
// Manager PIN approval for cashier-restricted actions (refund, cash out, close
// with variance). Does not swap the session — the cashier stays signed in;
// we just verify a Store Manager or Admin PIN and audit-log the approval.
$router->post('/api/v1/auth/manager-approval', [AuthController::class, 'verifyManagerPin']);
$router->post('/api/v1/auth/forgot-password', [AuthController::class, 'forgotPassword']);
$router->post('/api/v1/auth/verify-reset-otp', [AuthController::class, 'verifyResetOtp']);
$router->post('/api/v1/auth/reset-password', [AuthController::class, 'resetPassword']);

// ============================================================
// AUTHENTICATED ROUTES
// ============================================================

$router->group('/api/v1', function($router) {

    // Odoo-style capability gates (see Core\PosAccess). Capabilities inherit
    // upward, so 'pos.refund' passes for BASIC or ADVANCED, 'pos.register_close'
    // requires ADVANCED, and 'pos.sell' passes for anyone with any POS level.
    // Superadmin is auto-bypassed by role→level mapping.
    $CAP = fn(string ...$caps) => new PosCapabilityMiddleware(...$caps);

    // Operational-endpoint gate — a live cashier must be PINned into the
    // terminal. A locked POS returns 401 even for an Admin account.
    $NEEDS_CASHIER = fn() => new PosCashierRequiredMiddleware();

    // AUTH
    $router->post('/auth/logout', [AuthController::class, 'logout']);
    $router->post('/auth/pos-lock', [AuthController::class, 'posLock']);
    $router->get('/auth/me', [AuthController::class, 'me']);
    $router->post('/auth/change-password', [AuthController::class, 'changePassword']);
    // CURDUN PLATFORM CORE + TENANT USER MANAGEMENT
    $router->get('/platform/overview', [PlatformController::class, 'overview']);
    $router->get('/platform/companies', [PlatformController::class, 'companies']);
    $router->post('/platform/companies', [PlatformController::class, 'createCompany']);
    $router->put('/platform/companies/{id}', [PlatformController::class, 'updateCompany']);
    $router->delete('/platform/companies/{id}', [PlatformController::class, 'deleteCompany']);
    $router->get('/platform/users', [PlatformController::class, 'users']);
    $router->post('/platform/users', [PlatformController::class, 'createUser']);
    $router->put('/platform/users/{id}', [PlatformController::class, 'updateUser']);
    $router->delete('/platform/users/{id}', [PlatformController::class, 'deleteUser']);
    $router->post('/platform/users/{id}/reset-password', [PlatformController::class, 'resetUser']);
    $router->get('/platform/branches', [PlatformController::class, 'branches']);

    // RETAIL POS - the only live tenant module
    $router->get('/pos/bootstrap', [PosController::class, 'bootstrap']);
    $router->get('/pos/dashboard', [PosController::class, 'dashboard']);
    // --- Read endpoints (everyone signed in can view) ---
    $router->get('/pos/products', [PosController::class, 'products']);
    $router->get('/pos/customers', [PosController::class, 'customers']);
    $router->get('/pos/transactions', [PosController::class, 'transactions']);
    $router->get('/pos/sessions', [PosController::class, 'sessions']);
    $router->get('/pos/payments', [PosController::class, 'payments']);
    $router->get('/pos/session/current', [PosController::class, 'currentSession']);
    $router->get('/pos/sessions/{id}/summary', [PosController::class, 'sessionSummary']);
    $router->get('/pos/staff', [PosController::class, 'staff']);

    // Access snapshot — frontend hydrates its access-level model from this so
    // it stays in lockstep with Core\PosAccess (Rule #16 — one source of truth).
    $router->get('/pos/access', [PosController::class, 'access']);

    // --- OPERATIONAL POS ACTIONS ---------------------------------
    // These endpoints only make sense while a cashier is at the terminal.
    // NEEDS_CASHIER rejects with 401 if the terminal is locked, even for
    // an Admin browser account — otherwise Lock would be defeated.
    //
    // Odoo MINIMAL — selling, receive payments, validate orders.
    $router->post('/pos/checkout',                       [PosController::class, 'checkout'],       [$NEEDS_CASHIER(), $CAP('pos.sell','pos.order_validate')]);
    // Debt collection is a payment on the customer account; Odoo binds this
    // to BASIC (customer account operations).
    $router->post('/pos/customers/{id}/collect-debt',    [PosController::class, 'collectDebt'],    [$NEEDS_CASHIER(), $CAP('pos.payment_receive')]);

    // Odoo BASIC — open register, refunds, cash movements.
    $router->post   ('/pos/sessions/open',                  [PosController::class, 'openSession'],    [$NEEDS_CASHIER(), $CAP('pos.register_open')]);
    $router->post   ('/pos/transactions/{id}/void',         [PosController::class, 'voidTransaction'],[$NEEDS_CASHIER(), $CAP('pos.refund')]);
    $router->post   ('/pos/orders/{id}/refund',             [PosController::class, 'refundOrder'],    [$NEEDS_CASHIER(), $CAP('pos.refund')]);
    $router->post   ('/pos/sessions/{id}/cash-movements',   [PosController::class, 'cashMovement'],   [$NEEDS_CASHIER(), $CAP('pos.cash_in')]);

    // Odoo ADVANCED — closing control, reconciliation.
    $router->post   ('/pos/sessions/{id}/close',            [PosController::class, 'closeSession'],   [$NEEDS_CASHIER(), $CAP('pos.register_close','pos.closing_control')]);
    $router->post   ('/pos/shifts/close',                   [PosController::class, 'closeShift'],     [$NEEDS_CASHIER(), $CAP('pos.register_close','pos.closing_control')]);

    // --- BACK-OFFICE CONFIGURATION -------------------------------
    // Bound to the ACCOUNT's access level (Odoo model), not the active
    // cashier — an Admin browser session can edit products from any tab.
    // See PosCapabilityMiddleware note in PosService about accountCan().
    $router->post   ('/pos/products',                       [PosController::class, 'createProduct'],   [$CAP('pos.product_admin')]);
    $router->put    ('/pos/products/{id}',                  [PosController::class, 'updateProduct'],   [$CAP('pos.product_admin')]);
    $router->delete ('/pos/products/{id}',                  [PosController::class, 'deleteProduct'],   [$CAP('pos.product_admin')]);
    $router->post   ('/pos/customers',                      [PosController::class, 'createCustomer'], [$CAP('pos.customer_create')]);
    $router->put    ('/pos/customers/{id}',                 [PosController::class, 'updateCustomer'], [$CAP('pos.customer_admin')]);
    $router->delete ('/pos/customers/{id}',                 [PosController::class, 'deleteCustomer'], [$CAP('pos.customer_admin')]);

    // --- POS administration: staff, settings ---
    $router->get    ('/pos/settings',           [PosController::class, 'settings'],     [$CAP('pos.settings')]);
    $router->put    ('/pos/settings',           [PosController::class, 'updateSettings'],[$CAP('pos.settings')]);
    $router->post   ('/pos/staff',              [PosController::class, 'createStaff'],  [$CAP('pos.staff_admin')]);
    $router->put    ('/pos/staff/{id}',         [PosController::class, 'updateStaff'],  [$CAP('pos.staff_admin')]);
    $router->get('/pos/reports', [PosController::class, 'reports']);
    $router->get('/pos/stock-alerts', [PosController::class, 'stockAlerts']);
    $router->post('/pos/stock-alerts/read-all', [PosController::class, 'markAllStockAlertsRead']);
    $router->post('/pos/stock-alerts/{id}/read', [PosController::class, 'markStockAlertRead']);

    // All legacy module APIs remain intentionally unregistered until their
    // tenant isolation, permissions, and user interfaces are production-ready.

}, [new AuthMiddleware()]);
