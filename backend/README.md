# Curdun ERP Backend System

A robust, Pure PHP 8+ MVC REST API backing the COR Platform for CURDUN ICT Solutions.

## 1. Project Overview
Curdun ERP provides a comprehensive resource planning and operational system tailored for businesses. The backend is designed as a secure, fast, and scalable REST API using modern PHP 8 architecture without heavy external frameworks.

## 2. Architecture
- **Language**: PHP 8+ (Strict types, named arguments, attributes)
- **Design Pattern**: Pure Custom MVC (Model-View-Controller), though primarily serving JSON (Model-Controller-Service-Repository).
- **Core Components**: PSR-4 Autoloading, custom Router, unified Dependency Injection, custom middleware pipeline.
- **Database**: MySQL 8+ with PDO (Prepared Statements).
- **No Heavy Frameworks**: Entirely custom-built for high performance.

## 3. Requirements
- PHP 8.0 or higher
- MySQL 8.0 or higher
- Composer
- Apache or Nginx web server (with URL rewriting enabled)
- Git

## 4. Installation Steps
1. **Clone the repository**:
   ```bash
   git clone <repo-url> curdun-ict-ERP-system-main
   cd curdun-ict-ERP-system-main/backend
   ```
2. **Install Dependencies**:
   ```bash
   composer install
   ```
3. **Configuration**:
   Copy `.env.example` to `.env` and fill in your database credentials:
   ```bash
   cp .env.example .env
   ```
4. **Database Setup**:
   Create a MySQL database named `curdun_erp`:
   ```sql
   CREATE DATABASE curdun_erp;
   ```
   Import the schema and seed data:
   ```bash
   mysql -u root -p curdun_erp < database/curdun_erp.sql
   php database/seed_pos.php
   ```
5. **Web Server Setup**:
   - **Apache**: Point your VirtualHost DocumentRoot to `backend/public/`. Ensure `mod_rewrite` is enabled.
   - **XAMPP**: Place the project folder in `htdocs` and access via `http://localhost/curdun-ict-ERP-system-main/backend/public/`.

## 5. Default Login
- **Email**: `admin@curdun.so`
- **Password**: `Admin@1234`
*(Important: Change these credentials immediately in a production environment)*

## 6. Authentication
Authentication is session-based.
- Send a `POST` request to `/api/v1/auth/login` with `email` and `password`.
- The server returns user details and sets an HTTP-only session cookie.
- All subsequent authenticated requests will use this session cookie.

## 7. Role-Based Access Control (RBAC)
The system uses Roles and Permissions to secure endpoints.
- **Roles**: Super Admin, Admin, Manager, Cashier, etc.
- **Permissions**: Granular control over actions (e.g., `create_user`, `delete_invoice`).
Middleware checks these permissions before controller execution.

## 8. Active API Endpoints

Only Curdun platform-core and Retail POS routes are active. Older ERP module controllers remain in the repository for later development, but their routes are intentionally disabled until their tenant and permission contracts are completed.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/login` | Authenticate user and start session |
| POST | `/api/v1/auth/logout` | End session |
| GET | `/api/v1/auth/me` | Get current logged-in user details |
| GET/POST | `/api/v1/platform/companies` | List/provision tenant companies (Super Admin) |
| PUT/DELETE | `/api/v1/platform/companies/{id}` | Update/deactivate a company (Super Admin) |
| GET/POST | `/api/v1/platform/users` | Tenant-scoped user management |
| PUT | `/api/v1/platform/users/{id}` | Update a tenant-scoped user |
| POST | `/api/v1/platform/users/{id}/reset-password` | Deliver reset by email link or SMS OTP (`channel`) |
| POST | `/api/v1/auth/verify-reset-otp` | Verify a 6-digit SMS OTP and receive a reset token |
| GET | `/api/v1/pos/bootstrap` | Load the authorized POS workspace |
| GET/POST/PUT/DELETE | `/api/v1/pos/products[...]` | Tenant-scoped products and stock |
| GET/POST/PUT/DELETE | `/api/v1/pos/customers[...]` | Tenant-scoped customers and debt |
| POST | `/api/v1/pos/checkout` | Idempotent register sale with server-side totals, stock and split payments |
| GET/POST | `/api/v1/pos/session/current`, `/api/v1/pos/sessions/open` | Read/open the branch register session |
| GET/POST | `/api/v1/pos/sessions/{id}/summary`, `/api/v1/pos/sessions/{id}/close` | Reconcile and close a register |
| POST | `/api/v1/pos/sessions/{id}/cash-movements` | Register a reasoned cash in/out operation |
| POST | `/api/v1/pos/orders/{id}/refund` | Create an immutable linked negative refund order |
| GET/POST/PUT | `/api/v1/pos/staff[...]` | Company Admin/Store Manager staff controls |
| GET/PUT | `/api/v1/pos/settings` | Persistent POS settings |
| GET | `/api/v1/pos/reports?from=YYYY-MM-DD&to=YYYY-MM-DD` | Tenant-scoped sales, payment, product, inventory, customer, staff and shift report (Admin/Store Manager) |
| GET | `/api/v1/pos/stock-alerts` | Open low/out-of-stock notifications for the signed-in manager |
| POST | `/api/v1/pos/stock-alerts/{id}/read` | Mark one notification read for the signed-in manager |
| POST | `/api/v1/pos/stock-alerts/read-all` | Mark all open stock notifications read for the signed-in manager |

## 9. Request/Response Examples

**Example Request: Login**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
    "email": "admin@curdun.so",
    "password": "Admin@1234"
}
```

**Example Response: Success**
```json
{
    "success": true,
    "message": "Login successful",
    "data": {
        "id": 1,
        "name": "System Administrator",
        "email": "admin@curdun.so",
        "roles": ["Super Admin"]
    },
    "errors": null
}
```

## 10. HTTP Status Codes
| Code | Meaning | Usage |
|---|---|---|
| 200 | OK | Successful GET, PUT, PATCH request |
| 201 | Created | Successful POST request creating a resource |
| 400 | Bad Request | Invalid input or validation failure |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated, but lacking permissions |
| 404 | Not Found | Resource not found |
| 500 | Server Error | Internal system exception |

## 11. Response Format
All API responses follow a strict, unified JSON format:
```json
{
    "success": true|false,
    "message": "Human readable status string",
    "data": { ... }, // Null on error, Object/Array on success
    "errors": { ... } // Null on success, Object on error
}
```

## 12. Database Structure
Key tables include:
- `users`, `roles`, `permissions`, `role_permissions`, `user_roles`: RBAC and identity.
- `companies`, `branches`, `departments`: Organization structure.
- `customers`, `suppliers`: Entity management.
- `categories`, `units`, `products`, `warehouses`, `inventory_movements`: Stock and catalog.
- `orders`, `order_items`, `invoices`, `invoice_items`, `payments`: Sales and cashflow.
- `purchases`, `purchase_items`, `expenses`: Expenditures.
- `audit_logs`: Tracking system changes.

## 13. Business Logic
- **Order Flow**: Draft -> Confirmed -> Completed. Updates inventory on completion.
- **Payment Flow**: Creates payment record -> updates invoice `paid_amount` -> marks invoice as Paid or Partially Paid.
- **Inventory Flow**: Supports adjusting stock, transferring between warehouses, automated deductions upon sales order completion.

## 14. Security
- SQL Injection protection via 100% PDO Prepared Statements.
- Passwords hashed using PHP's robust `password_hash()` (Bcrypt/Argon2).
- Session fixation protection and HttpOnly cookies.
- Strict input validation in service classes.

## 15. Troubleshooting
- **Database Connection Fails**: Check `.env` matches your MySQL credentials.
- **404 Errors on API routes**: Ensure Apache `mod_rewrite` is enabled and `.htaccess` is processing requests to `public/index.php`.
- **Permission Denied (Linux/Mac)**: Ensure the `logs/` and `storage/` directories are writable by the web server process.

## 16. Production Deployment
Before going live:
1. Set `APP_DEBUG=false` in `.env`.
2. Change the default Admin password immediately.
3. Use HTTPS (SSL) everywhere.
4. Ensure `CORS` headers in `public/index.php` are restricted to your exact frontend domain, rather than `*`.

### Password email and SMS delivery

Local development defaults to `MAIL_TRANSPORT=log` and `SMS_TRANSPORT=log`. Messages are written to `storage/logs/delivery-outbox.log`, and the Super Admin UI clearly labels them as previews. To send externally in production:

1. Set `APP_PUBLIC_URL` to the HTTPS frontend origin.
2. Set `MAIL_TRANSPORT=smtp` plus `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION`, and the sender identity.
3. Set `SMS_TRANSPORT=http` plus `SMS_GATEWAY_URL`, `SMS_GATEWAY_TOKEN`, and `SMS_SENDER_ID`. The gateway receives JSON containing `to`, `message`, and `sender` with a Bearer token.
4. Run `database/migrations/2026_08_12_password_delivery.sql`.
5. Run `database/migrations/2026_08_12_odoo_pos_core.sql` for the Retail POS register/order lifecycle.
6. Confirm a real email and SMS OTP in staging before enabling production traffic.

Reset email links expire after 60 minutes. SMS OTPs expire after 10 minutes, allow five attempts, and are stored only as password hashes. All Super Admin delivery attempts are recorded in `delivery_logs` and `audit_logs`.

---
*© Curdun ICT Solutions - All Rights Reserved*
