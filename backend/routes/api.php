<?php
// routes/api.php

use App\Controllers\AuthController;
use App\Controllers\PlatformController;
use App\Controllers\PosController;
use App\Middleware\AuthMiddleware;
use App\Middleware\PosRoleMiddleware;
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

    // Role-gate presets. superadmin is auto-bypassed inside PosRoleMiddleware.
    // Defined inside the group closure so `$router` and these live in the same scope.
    $MGR_UP     = fn() => new PosRoleMiddleware('admin', 'store_manager');
    $SENIOR_UP  = fn() => new PosRoleMiddleware('admin', 'store_manager', 'senior_cashier');
    $ADMIN_ONLY = fn() => new PosRoleMiddleware('admin');

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

    // --- OPERATIONAL POS ACTIONS ---------------------------------
    // These endpoints only make sense while a cashier is at the terminal.
    // NEEDS_CASHIER rejects with 401 if the terminal is locked, even for
    // an Admin browser account — otherwise Lock would be defeated.
    //
    // Sell (any signed-in cashier)
    $router->post('/pos/checkout',                       [PosController::class, 'checkout'],       [$NEEDS_CASHIER()]);
    $router->post('/pos/customers/{id}/collect-debt',    [PosController::class, 'collectDebt'],    [$NEEDS_CASHIER()]);

    // Register session lifecycle + refunds (Manager+ AND live cashier)
    $router->post   ('/pos/sessions/open',                  [PosController::class, 'openSession'],    [$NEEDS_CASHIER(), $MGR_UP()]);
    $router->post   ('/pos/sessions/{id}/close',            [PosController::class, 'closeSession'],   [$NEEDS_CASHIER(), $MGR_UP()]);
    $router->post   ('/pos/shifts/close',                   [PosController::class, 'closeShift'],     [$NEEDS_CASHIER(), $MGR_UP()]);
    $router->post   ('/pos/transactions/{id}/void',         [PosController::class, 'voidTransaction'],[$NEEDS_CASHIER(), $MGR_UP()]);
    $router->post   ('/pos/orders/{id}/refund',             [PosController::class, 'refundOrder'],    [$NEEDS_CASHIER(), $MGR_UP()]);

    // Cash movements (Senior Cashier+ AND live cashier)
    $router->post   ('/pos/sessions/{id}/cash-movements',   [PosController::class, 'cashMovement'],   [$NEEDS_CASHIER(), $SENIOR_UP()]);

    // --- BACK-OFFICE CONFIGURATION -------------------------------
    // Account permissions govern these. They intentionally do NOT require
    // a live cashier — an Admin can edit products from any browser tab.
    $router->post   ('/pos/products',                       [PosController::class, 'createProduct'],   [$MGR_UP()]);
    $router->put    ('/pos/products/{id}',                  [PosController::class, 'updateProduct'],   [$MGR_UP()]);
    $router->delete ('/pos/products/{id}',                  [PosController::class, 'deleteProduct'],   [$MGR_UP()]);
    $router->post   ('/pos/customers',                      [PosController::class, 'createCustomer'], [$MGR_UP()]);
    $router->put    ('/pos/customers/{id}',                 [PosController::class, 'updateCustomer'], [$MGR_UP()]);
    $router->delete ('/pos/customers/{id}',                 [PosController::class, 'deleteCustomer'], [$MGR_UP()]);

    // --- Admin-only: staff, settings ---
    $router->get    ('/pos/settings',           [PosController::class, 'settings'],     [$ADMIN_ONLY()]);
    $router->put    ('/pos/settings',           [PosController::class, 'updateSettings'],[$ADMIN_ONLY()]);
    $router->post   ('/pos/staff',              [PosController::class, 'createStaff'],  [$ADMIN_ONLY()]);
    $router->put    ('/pos/staff/{id}',         [PosController::class, 'updateStaff'],  [$ADMIN_ONLY()]);
    $router->get('/pos/reports', [PosController::class, 'reports']);
    $router->get('/pos/stock-alerts', [PosController::class, 'stockAlerts']);
    $router->post('/pos/stock-alerts/read-all', [PosController::class, 'markAllStockAlertsRead']);
    $router->post('/pos/stock-alerts/{id}/read', [PosController::class, 'markStockAlertRead']);

    // All legacy module APIs remain intentionally unregistered until their
    // tenant isolation, permissions, and user interfaces are production-ready.

}, [new AuthMiddleware()]);
