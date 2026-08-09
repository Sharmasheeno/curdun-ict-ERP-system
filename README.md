# Curdun ICT — Cor Platform

A production-style **multi-tenant ERP + Retail POS** for Somali businesses. Vanilla **PHP 8+ backend** (REST API, MySQL 8, PDO, RBAC) with a vanilla **HTML/CSS/JavaScript frontend** — no frameworks, no build step, no bundler.

**Scope in this repo**: marketing site → Cor Platform sign-in → Super Admin console → Company Workspace → **Retail POS** (with staff PIN + admin email/password auth, force-change-on-first-login for temp passwords).

Backend and frontend both serve from **one port** (single `public/` directory), matching how real Apache/Nginx deployments work.

---

## Highlights

- **Zero framework** — pure PHP 8 MVC (custom Router, PSR-4 autoload, PDO prepared statements) + vanilla JS state-machine on the client.
- **Two-tier auth** — email + password for the platform sign-in; 4-digit PIN for POS cashier stations; force-change-on-first-login for any admin issued a temporary password.
- **RBAC** — `superadmin`, `Admin`, `Store Manager`, `Senior Cashier`, `Cashier` roles each get filtered sidebar tabs and role-specific dashboards.
- **34-table MySQL schema** — Auth & ACL, Organization, CRM, Inventory, Purchases, Sales, Finance, System — with row-locked stock updates and atomic order completion.
- **Mobile-responsive** — sidebars collapse into a fixed bottom tab bar at ≤720px; header stays sticky with a compact user + logout pill.
- **USD-only pricing** (Somalia's practical trade currency); wholesale pricing per product; per-store defaults; audit logs on every mutation.

---

## Quick Start

### Requirements

- PHP 8.0+ · MySQL 8.0+ · Composer · a web server (Apache or the built-in PHP dev server)

### Setup

```bash
git clone https://github.com/Sharmasheeno/curdun-ict-ERP-system.git
cd curdun-ict-ERP-system/backend

# 1. Install PHP dependencies
composer install

# 2. Configure the database
cp .env.example .env               # then edit DB_USERNAME / DB_PASSWORD

# 3. Create + import the schema (34 tables + seed data)
mysql -u root -e "CREATE DATABASE curdun_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root curdun_erp < database/curdun_erp.sql

# 4. Seed a PIN for the default admin (so POS PIN login works)
HASH=$(php -r "echo password_hash('1234', PASSWORD_BCRYPT);")
mysql -u root curdun_erp -e "UPDATE users SET pin_hash = '$HASH' WHERE email = 'admin@curdun.so';"

# 5. Run the whole app on ONE port
php -S localhost:8000 -t public/ public/router.php
```

Open in your browser:

| URL | Screen |
|---|---|
| `http://localhost:8000/` | Marketing landing page |
| `http://localhost:8000/app.html` | Cor Platform sign-in |
| `http://localhost:8000/api/v1/**` | Backend REST API |

That's it — the same `public/` directory serves HTML/CSS/JS static files and the PHP API. No separate frontend server.

---

## Default Login Credentials

There are **no demo cards** on the sign-in screen anymore. Type real credentials.

### Cor Platform sign-in (`app.html`)

| Email | Password | Lands on |
|---|---|---|
| `admin@curdun.so` | `Admin@1234` | Curdun Super Admin console |
| `admin@shifo.so` | `Cor-7441GS-24` | Shifo Pharmacy workspace |

Any other credential is rejected with **"Invalid email or password."**

### Retail POS — staff PIN entry

Open Retail POS from the workspace and tap a staff avatar:

| Staff | Role | PIN |
|---|---|---|
| Fartun Ali | Senior Cashier | `1234` |
| Mohamed Farah | Cashier | `5678` |
| Ismail Omar | Cashier | `9012` |
| **Khadija Abdi** | **Store Manager** | `3456` |
| Hassan Yusuf | Cashier | `7890` |
| Nimco Ali | Cashier | `2468` |

### Retail POS — Company Admin (email + password)

Click **"Sign in as Admin (email)"** below the staff grid: `admin@shifo.so` / `Cor-7441GS-24` → forced to set a new POS password → full Admin access (Dashboard, Checkout, Products, Customers, Transactions, Staff, Settings).

The temp password **`Cor-7441GS-24`** works forever in the Core workspace but only **once** in the Retail POS — after the first login the admin sets a new POS password and only that one works for POS from then on.

### Backend REST API — quick smoke test

```bash
# PIN login (POS cashier station)
curl -X POST http://localhost:8000/api/v1/auth/pin-login \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234"}' -c /tmp/cookies.txt

# Email login (any admin)
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@curdun.so","password":"Admin@1234"}' -c /tmp/cookies.txt

# Create product with wholesale price
curl -X POST http://localhost:8000/api/v1/products \
  -H "Content-Type: application/json" -b /tmp/cookies.txt \
  -d '{"name":"Basmati Rice 5kg","selling_price":12.00,"wholesale_price":11.00}'
```

---

## Architecture

```
curdun-ict-ERP-system/
├── index.html, app.html      # Marketing site + Cor app shell
├── css/, js/, assets/        # Frontend source of truth
└── backend/
    ├── app/
    │   ├── Controllers/      (26)  Thin HTTP layer
    │   ├── Services/         (25)  Business logic + validation + audit
    │   ├── Repositories/     (23)  PDO data access (base + specific)
    │   ├── Models/           (31)  Entity models with $fillable/$hidden
    │   └── Middleware/       (3)   Auth, Role, Permission
    ├── core/                       Framework: Database, Router, Session,
    │                               Request, Response, Auth, Validator, Logger,
    │                               ExceptionHandler, ApiException
    ├── config/                     .env-driven config + constants
    ├── database/
    │   ├── curdun_erp.sql          34-table schema + seed data
    │   ├── migrations/             Additive migrations (dated files)
    │   └── seed.php                Optional programmatic seeder
    ├── routes/api.php              REST API v1 endpoints
    ├── public/
    │   ├── index.php               Single entry point
    │   ├── router.php              For `php -S` dev server
    │   ├── .htaccess               For Apache production
    │   ├── index.html → ../../     Frontend symlinks
    │   ├── app.html   → ../../
    │   ├── css/ → ../../css/
    │   ├── js/  → ../../js/
    │   └── assets/ → ../../assets/
    ├── helpers/, exceptions/       Response helpers + typed exceptions
    └── CURDUN_ERP_BACKEND_DOCUMENTATION.pdf
```

### Request lifecycle

```
HTTP → public/router.php (or Apache)
     → public/index.php
     → Core\Router->dispatch()
     → Middleware pipeline (Auth, Permission)
     → App\Controllers\XyzController (DI-resolved via reflection)
     → App\Services\XyzService (business logic, validation, audit)
     → App\Repositories\XyzRepository (PDO prepared statements)
     → MySQL 8
```

### Auth model

| Screen | Method | Session |
|---|---|---|
| Cor Platform sign-in (`app.html`) | Email + password | `PHPSESSID` cookie |
| Retail POS staff PIN entry | 4-digit PIN → matched via bcrypt against active users in branch | Same session |
| Retail POS admin email/password | Email + password (temp or set) | Same session |
| Force-change screen | Set new password when `mustChangePassword` / `mustChangePosPassword` is true | — |

Rate-limiting: 5 attempts / 5 minutes per IP on both login endpoints. Session cookies are `HttpOnly`, `SameSite=Strict`, `Secure` when HTTPS.

---

## REST API — endpoint reference

Public:
- `POST /api/v1/auth/login` · `POST /api/v1/auth/pin-login` · `POST /api/v1/auth/forgot-password` · `POST /api/v1/auth/reset-password`

Authenticated (session cookie required):
- `GET /auth/me` · `POST /auth/logout`
- `GET/POST/PUT/DELETE /users` · `POST /users/{id}/roles`
- `GET/POST /roles` · `GET /permissions`
- `GET/POST/PUT/DELETE /customers` · `/suppliers` · `/products` · `/categories` · `/units` · `/warehouses`
- `GET /products/low-stock`
- `GET/POST /inventory` · `POST /inventory/adjust` · `POST /inventory/transfer`
- `GET/POST /orders` · `POST /orders/{id}/complete` (atomic stock lock + invoice creation)
- `GET/POST /invoices` · `POST /payments`
- `GET/POST /expenses` · `GET /reports/sales` · `GET /reports/revenue`
- `GET /dashboard/summary` · `GET /audit-logs`

Full endpoint table with permission requirements in [backend/CURDUN_ERP_BACKEND_DOCUMENTATION.pdf](backend/CURDUN_ERP_BACKEND_DOCUMENTATION.pdf).

---

## Modules on the frontend

| Module | Screens |
|---|---|
| **Marketing Site** (`index.html`) | Hero, modules grid, pricing, contact |
| **Cor Sign-In** (`app.html`) | Email + password; force-change flow for temp passwords |
| **Super Admin** | Overview, Companies, Company Admins, **Platform Admins** (new), Systems Catalog, Infrastructure, Billing & Subs, Audit & Compliance |
| **Company Workspace** | Module launcher, user pill, sign-out |
| **Pharmacy** | Dashboard, Users, Branches, Reports, Settings |
| **Retail POS** | Dashboard (role-specific), Checkout, Products, Customers, Transactions, Staff, Settings (dynamic) |

**Platform Admins tab** (Super Admin): list Cor-level operators, create new super admin with auto-generated temp password (`Cor-XXXXXX-26`), new admin forced to reset on first sign-in.

---

## Role-Based Access Control (Retail POS)

```js
const POS_ROLES = {
  'Cashier':        ['dash','checkout','transactions'],
  'Senior Cashier': ['dash','checkout','transactions'],
  'Store Manager':  ['dash','checkout','products','customers','transactions','staff'],
  'Admin':          ['dash','checkout','products','customers','transactions','staff','settings'],
};
```

- **Cashiers** see a personal shift dashboard (My Sales, My Transactions, Start/End Shift).
- **Managers/Admins** see the global store dashboard (Today's Sales, Transactions, Avg Ticket, Active Staff, Hourly Sales chart, Payment Methods, Top Sellers).

New staff created from the "Create Staff Account" panel get an auto-generated username (`firstname.lastInitial`) and a random 4-digit PIN, shown once.

---

## Mobile Responsiveness

Every dashboard adapts down to a 320×568 viewport. Breakpoints: `≤1100px` (tablet — grids drop to 2 cols), `≤720px` (mobile — sidebar → fixed bottom tab bar with sticky top brand and compact user/logout pill), `≤420px` (small mobile — full single column).

Details:
- Inline `grid-template-columns` on render templates are forced to single-column on mobile via `[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }`
- Tables scroll horizontally with `min-width: 560px`
- Modals fill the viewport at `calc(100vw - 20px)`
- POS checkout stacks (product grid on top, cart panel below)

---

## Production Deployment

Apache: point `DocumentRoot` at `backend/public/`. `mod_rewrite` on. The existing `.htaccess` handles routing (`DirectoryIndex index.html index.php` + front-controller pattern for anything that isn't a real file).

Nginx equivalent:
```nginx
root /path/to/curdun-ict-ERP-system/backend/public;
index index.html index.php;
location / { try_files $uri $uri/ /index.php?$query_string; }
location ~ \.php$ { fastcgi_pass unix:/run/php/php-fpm.sock; include fastcgi_params; }
```

Before going live:
- Change `admin@curdun.so` password from the default `Admin@1234`
- Set `APP_ENV=production`, `APP_DEBUG=false` in `.env`
- Force HTTPS (`.htaccess` or Nginx redirect) so session cookies get the `Secure` flag
- Grant a dedicated MySQL user rather than using `root`

---

## Tech Stack

**Backend**: PHP 8+ (strict types), MySQL 8+, PDO prepared statements, session-based auth, bcrypt hashing (cost 12), custom router with reflection-based DI, PSR-4 autoload via Composer. Zero framework dependencies beyond `vlucas/phpdotenv`.

**Frontend**: HTML5, CSS3 (CSS custom properties for design tokens, no preprocessor), vanilla JS state-machine (one global `S` object, `render()` router, template-literal HTML). No build step, no bundler, no npm — open `app.html` directly.

---

## Author

**Abdisharma Hassan** ([@Sharmasheeno](https://github.com/Sharmasheeno))

Curdun ICT Solution — a complete Somali multi-tenant business platform.

## License

© 2026 Curdun ICT Solution. All rights reserved.
