<?php
// routes/api.php

use App\Controllers\AuthController;
use App\Controllers\UserController;
use App\Controllers\RoleController;
use App\Controllers\PermissionController;
use App\Controllers\CompanyController;
use App\Controllers\BranchController;
use App\Controllers\DepartmentController;
use App\Controllers\CustomerController;
use App\Controllers\SupplierController;
use App\Controllers\CategoryController;
use App\Controllers\UnitController;
use App\Controllers\ProductController;
use App\Controllers\WarehouseController;
use App\Controllers\InventoryController;
use App\Controllers\PurchaseController;
use App\Controllers\OrderController;
use App\Controllers\SalesReturnController;
use App\Controllers\InvoiceController;
use App\Controllers\PaymentController;
use App\Controllers\ExpenseController;
use App\Controllers\ReportController;
use App\Controllers\DashboardController;
use App\Controllers\NotificationController;
use App\Controllers\SettingsController;
use App\Controllers\AuditLogController;
use App\Middleware\AuthMiddleware;
use App\Middleware\PermissionMiddleware;

$authMiddleware = new AuthMiddleware();

// ============================================================
// PUBLIC ROUTES (no auth required)
// ============================================================

$router->post('/api/v1/auth/login', [AuthController::class, 'login']);
$router->post('/api/v1/auth/pin-login', [AuthController::class, 'pinLogin']);
$router->post('/api/v1/auth/forgot-password', [AuthController::class, 'forgotPassword']);
$router->post('/api/v1/auth/reset-password', [AuthController::class, 'resetPassword']);

// ============================================================
// AUTHENTICATED ROUTES
// ============================================================

$router->group('/api/v1', function($router) {

    // AUTH
    $router->post('/auth/logout', [AuthController::class, 'logout']);
    $router->get('/auth/me', [AuthController::class, 'me']);

    // USERS
    $router->get('/users', [UserController::class, 'index']);
    $router->post('/users', [UserController::class, 'store']);
    $router->get('/users/{id}', [UserController::class, 'show']);
    $router->put('/users/{id}', [UserController::class, 'update']);
    $router->delete('/users/{id}', [UserController::class, 'destroy']);
    $router->post('/users/{id}/roles', [UserController::class, 'assignRoles']);
    $router->post('/users/{id}/change-password', [UserController::class, 'changePassword']);

    // ROLES
    $router->get('/roles', [RoleController::class, 'index']);
    $router->post('/roles', [RoleController::class, 'store']);
    $router->get('/roles/{id}', [RoleController::class, 'show']);
    $router->put('/roles/{id}', [RoleController::class, 'update']);
    $router->delete('/roles/{id}', [RoleController::class, 'destroy']);
    $router->post('/roles/{id}/permissions', [RoleController::class, 'syncPermissions']);

    // PERMISSIONS
    $router->get('/permissions', [PermissionController::class, 'index']);
    $router->get('/permissions/{id}', [PermissionController::class, 'show']);

    // COMPANIES
    $router->get('/companies', [CompanyController::class, 'index']);
    $router->post('/companies', [CompanyController::class, 'store']);
    $router->get('/companies/{id}', [CompanyController::class, 'show']);
    $router->put('/companies/{id}', [CompanyController::class, 'update']);
    $router->delete('/companies/{id}', [CompanyController::class, 'destroy']);

    // BRANCHES
    $router->get('/branches', [BranchController::class, 'index']);
    $router->post('/branches', [BranchController::class, 'store']);
    $router->get('/branches/{id}', [BranchController::class, 'show']);
    $router->put('/branches/{id}', [BranchController::class, 'update']);
    $router->delete('/branches/{id}', [BranchController::class, 'destroy']);

    // DEPARTMENTS
    $router->get('/departments', [DepartmentController::class, 'index']);
    $router->post('/departments', [DepartmentController::class, 'store']);
    $router->get('/departments/{id}', [DepartmentController::class, 'show']);
    $router->put('/departments/{id}', [DepartmentController::class, 'update']);
    $router->delete('/departments/{id}', [DepartmentController::class, 'destroy']);

    // CUSTOMERS
    $router->get('/customers', [CustomerController::class, 'index']);
    $router->post('/customers', [CustomerController::class, 'store']);
    $router->get('/customers/{id}', [CustomerController::class, 'show']);
    $router->put('/customers/{id}', [CustomerController::class, 'update']);
    $router->delete('/customers/{id}', [CustomerController::class, 'destroy']);

    // SUPPLIERS
    $router->get('/suppliers', [SupplierController::class, 'index']);
    $router->post('/suppliers', [SupplierController::class, 'store']);
    $router->get('/suppliers/{id}', [SupplierController::class, 'show']);
    $router->put('/suppliers/{id}', [SupplierController::class, 'update']);
    $router->delete('/suppliers/{id}', [SupplierController::class, 'destroy']);

    // CATEGORIES
    $router->get('/categories', [CategoryController::class, 'index']);
    $router->get('/categories/tree', [CategoryController::class, 'tree']);
    $router->post('/categories', [CategoryController::class, 'store']);
    $router->get('/categories/{id}', [CategoryController::class, 'show']);
    $router->put('/categories/{id}', [CategoryController::class, 'update']);
    $router->delete('/categories/{id}', [CategoryController::class, 'destroy']);

    // UNITS
    $router->get('/units', [UnitController::class, 'index']);
    $router->post('/units', [UnitController::class, 'store']);
    $router->get('/units/{id}', [UnitController::class, 'show']);
    $router->put('/units/{id}', [UnitController::class, 'update']);
    $router->delete('/units/{id}', [UnitController::class, 'destroy']);

    // PRODUCTS
    $router->get('/products', [ProductController::class, 'index']);
    $router->post('/products', [ProductController::class, 'store']);
    $router->get('/products/low-stock', [ProductController::class, 'lowStock']);
    $router->get('/products/{id}', [ProductController::class, 'show']);
    $router->put('/products/{id}', [ProductController::class, 'update']);
    $router->delete('/products/{id}', [ProductController::class, 'destroy']);

    // WAREHOUSES
    $router->get('/warehouses', [WarehouseController::class, 'index']);
    $router->post('/warehouses', [WarehouseController::class, 'store']);
    $router->get('/warehouses/{id}', [WarehouseController::class, 'show']);
    $router->put('/warehouses/{id}', [WarehouseController::class, 'update']);
    $router->delete('/warehouses/{id}', [WarehouseController::class, 'destroy']);

    // INVENTORY
    $router->get('/inventory', [InventoryController::class, 'index']);
    $router->get('/inventory/movements', [InventoryController::class, 'movements']);
    $router->post('/inventory/adjust', [InventoryController::class, 'adjust']);
    $router->post('/inventory/transfer', [InventoryController::class, 'transfer']);

    // PURCHASES
    $router->get('/purchases', [PurchaseController::class, 'index']);
    $router->post('/purchases', [PurchaseController::class, 'store']);
    $router->get('/purchases/{id}', [PurchaseController::class, 'show']);
    $router->put('/purchases/{id}', [PurchaseController::class, 'update']);
    $router->delete('/purchases/{id}', [PurchaseController::class, 'destroy']);
    $router->post('/purchases/{id}/approve', [PurchaseController::class, 'approve']);
    $router->post('/purchases/{id}/receive', [PurchaseController::class, 'receive']);

    // ORDERS
    $router->get('/orders', [OrderController::class, 'index']);
    $router->post('/orders', [OrderController::class, 'store']);
    $router->get('/orders/{id}', [OrderController::class, 'show']);
    $router->put('/orders/{id}', [OrderController::class, 'update']);
    $router->delete('/orders/{id}', [OrderController::class, 'destroy']);
    $router->post('/orders/{id}/confirm', [OrderController::class, 'confirm']);
    $router->post('/orders/{id}/complete', [OrderController::class, 'complete']);

    // SALES RETURNS
    $router->get('/sales-returns', [SalesReturnController::class, 'index']);
    $router->post('/sales-returns', [SalesReturnController::class, 'store']);
    $router->get('/sales-returns/{id}', [SalesReturnController::class, 'show']);
    $router->post('/sales-returns/{id}/approve', [SalesReturnController::class, 'approve']);
    $router->post('/sales-returns/{id}/reject', [SalesReturnController::class, 'reject']);

    // INVOICES
    $router->get('/invoices', [InvoiceController::class, 'index']);
    $router->post('/invoices', [InvoiceController::class, 'store']);
    $router->get('/invoices/overdue', [InvoiceController::class, 'overdue']);
    $router->get('/invoices/{id}', [InvoiceController::class, 'show']);
    $router->put('/invoices/{id}', [InvoiceController::class, 'update']);
    $router->delete('/invoices/{id}', [InvoiceController::class, 'destroy']);
    $router->post('/invoices/{id}/send', [InvoiceController::class, 'send']);

    // PAYMENTS
    $router->get('/payments', [PaymentController::class, 'index']);
    $router->post('/payments', [PaymentController::class, 'store']);
    $router->get('/payments/{id}', [PaymentController::class, 'show']);
    $router->post('/payments/{id}/refund', [PaymentController::class, 'refund']);

    // EXPENSES
    $router->get('/expenses', [ExpenseController::class, 'index']);
    $router->post('/expenses', [ExpenseController::class, 'store']);
    $router->get('/expenses/{id}', [ExpenseController::class, 'show']);
    $router->put('/expenses/{id}', [ExpenseController::class, 'update']);
    $router->delete('/expenses/{id}', [ExpenseController::class, 'destroy']);
    $router->post('/expenses/{id}/approve', [ExpenseController::class, 'approve']);

    // REPORTS
    $router->get('/reports/sales', [ReportController::class, 'sales']);
    $router->get('/reports/revenue', [ReportController::class, 'revenue']);
    $router->get('/reports/expenses', [ReportController::class, 'expenses']);
    $router->get('/reports/invoices', [ReportController::class, 'invoices']);
    $router->get('/reports/payments', [ReportController::class, 'payments']);
    $router->get('/reports/inventory', [ReportController::class, 'inventory']);
    $router->get('/reports/customers', [ReportController::class, 'customers']);

    // DASHBOARD
    $router->get('/dashboard/summary', [DashboardController::class, 'summary']);
    $router->get('/dashboard/sales', [DashboardController::class, 'sales']);
    $router->get('/dashboard/revenue', [DashboardController::class, 'revenue']);
    $router->get('/dashboard/expenses', [DashboardController::class, 'expenses']);
    $router->get('/dashboard/customers', [DashboardController::class, 'customers']);
    $router->get('/dashboard/inventory', [DashboardController::class, 'inventory']);

    // NOTIFICATIONS
    $router->get('/notifications', [NotificationController::class, 'index']);
    $router->get('/notifications/count', [NotificationController::class, 'count']);
    $router->post('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    $router->post('/notifications/read-all', [NotificationController::class, 'markAllRead']);

    // SETTINGS
    $router->get('/settings', [SettingsController::class, 'index']);
    $router->post('/settings', [SettingsController::class, 'update']);

    // AUDIT LOGS
    $router->get('/audit-logs', [AuditLogController::class, 'index']);
    $router->get('/audit-logs/{id}', [AuditLogController::class, 'show']);

}, [new AuthMiddleware()]);
