# Curdun ICT — Cor Platform

A production-style **ERP + Retail POS frontend prototype** built entirely with vanilla **HTML, CSS, and JavaScript** — no frameworks, no build step, no dependencies. Designed as a full mock of a multi-tenant Somali business platform running the **Cor** operating layer across Pharmacy, Retail POS, Hospital, University, Hotel, HR, Financials and CRM modules.

**Live scope**: marketing site → Super Admin console → Company Workspace → Pharmacy backoffice → **Retail POS with full RBAC + PIN/email auth**.

---

## Highlights

- **Zero framework** — 100% vanilla JS state-machine (`const S = {…}` + `render()`) with template-literal rendering. Loads directly from `file://` or any static host.
- **Multi-tier auth** — email/password for backoffice, 4-digit PINs for POS cashier stations, force-change temp-password flow for company admins.
- **Role-Based Access Control** — Cashier, Senior Cashier, Store Manager, and Admin roles each get a filtered sidebar and role-specific dashboard.
- **Fully mobile-responsive** — sidebar collapses into a fixed bottom tab bar, header stays sticky, tables scroll, modals fill the viewport at ≤720px.
- **Realistic Somali market data** — Somali Shillings (Sh) conversion, EVC Plus / Hormuud SAT / Zaad mobile money, Buugga Deynta (credit book), Bakaara/Hodan/Wadajir stores.
- **Shift reconciliation, offline queue, wholesale toggle, dual currency display, live metrics with `setInterval` partial DOM updates.**

---

## Quick Start

```bash
git clone https://github.com/Sharmasheeno/curdun-ict-ERP-system.git
cd curdun-ict-ERP-system

# Any static server works — pick one:
python3 -m http.server 5188
# or
npx serve .
```

Then open:

| URL | Screen |
|---|---|
| `http://localhost:5188/` | Marketing site (`index.html`) |
| `http://localhost:5188/app.html` | Cor Platform sign-in |

You can also open `app.html` directly via `file://` — everything runs client-side.

---

## Default Login Credentials

### Core Platform Sign-In (`app.html`)

The password field is a demo router — routing is by email pattern:

| Email | Password | Lands on |
|---|---|---|
| `admin@curdun.so` | anything | Super Admin console (Cor overview) |
| `ahmed@shifo.so` | anything | Company Workspace (Shifo Pharmacy) |
| Any other valid email | anything | First-sign-in flow (set new password) |

Or tap the demo cards on the sign-in screen for one-click access.

### Retail POS — Staff PINs

Open the POS from the workspace, tap an avatar, then enter the 4-digit PIN:

| Staff | Role | PIN | Access |
|---|---|---|---|
| Fartun Ali | Senior Cashier | `1234` | Dashboard, Checkout, Transactions |
| Mohamed Farah | Cashier | `5678` | Dashboard, Checkout, Transactions |
| Ismail Omar | Cashier | `9012` | Dashboard, Checkout, Transactions |
| **Khadija Abdi** | **Store Manager** | `3456` | + Products, Customers, Staff |
| Hassan Yusuf | Cashier | `7890` | Dashboard, Checkout, Transactions |
| Nimco Ali | Cashier | `2468` | Dashboard, Checkout, Transactions |

### Retail POS — Company Admin (email + password)

Click **"Sign in as Admin (email)"** at the bottom of the POS staff grid:

| Email | Temporary Password | Behavior |
|---|---|---|
| `admin@shifo.so` | `Cor-7441GS-24` | Forces new POS password on first sign-in |

**Full Admin access**: Dashboard, Checkout, Products, Customers, Transactions, Staff, and **Settings**.

**Auth rules:**
- Core workspace login — temporary password works forever, no forced change.
- Retail POS — temp password works **only once**; after you set a new POS password, only that new one is accepted for POS.

---

## Modules

| Module | Purpose | Screens |
|---|---|---|
| **Marketing Site** (`index.html`) | Public landing / lead capture | Hero, modules grid, pricing, contact |
| **Sign-In** (`app.html`) | Shared entry for Curdun + company admins | Email/password + demo cards + first-login flow |
| **Super Admin** | Cor platform operations | Overview, Companies, Company Admins, Systems Catalog, Infrastructure, Billing & Subs, Audit & Compliance |
| **Company Workspace** | Launcher for licensed modules | Module cards, user pill, sign-out |
| **Pharmacy** | Backoffice for pharmacy operations | Dashboard, Users, Branches, Reports, Settings |
| **Retail POS** | Point-of-sale for retail | Dashboard, Checkout (product grid + cart), Products, Customers, Transactions, Staff, Settings |

---

## Role-Based Access Control (POS)

```js
const POS_ROLES = {
  'Cashier':        ['dash','checkout','transactions'],
  'Senior Cashier': ['dash','checkout','transactions'],
  'Store Manager':  ['dash','checkout','products','customers','transactions','staff'],
  'Admin':          ['dash','checkout','products','customers','transactions','staff','settings'],
};
```

The sidebar tabs and dashboard content are rendered dynamically per role:

- **Cashiers** see a personal shift dashboard (My Sales, My Transactions, Start/End Shift, shift duration).
- **Managers/Admins** see the global store dashboard (Today's Sales, Transactions, Avg Ticket, Active Staff, Hourly Sales chart, Payment Methods, Top Sellers).

New staff created through the "Create Staff Account" panel automatically get a generated username (`firstname.lastInitial`) and a random 4-digit PIN, and the correct `access` array based on their role.

---

## Mobile Responsiveness

Every dashboard adapts down to a 320×568 viewport:

- **Sidebars** collapse into a **fixed bottom tab bar** — all nav items scroll horizontally, always tappable.
- **Header** stays sticky at the top with a compact brand + user avatar + logout icon on the right.
- Multi-column grids collapse to single columns (KPI cards, module grants, catalog, workspace launcher).
- **POS checkout** stacks — product grid on top, cart panel below (instead of side-by-side).
- Tables scroll horizontally with `min-width: 560px` so columns stay readable.
- Modals fill the viewport (`calc(100vw - 20px)`) with scrollable bodies.
- Inline `grid-template-columns` from render templates are forced to single-column via `[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }`.

Breakpoints: `≤1100px` (tablet — sidebar stacks, grids drop to 2 cols), `≤720px` (mobile — bottom tab bar), `≤420px` (small mobile — full single column, smaller numpad).

---

## Tech Stack

- **HTML5** — semantic markup, hand-written per view.
- **CSS3** — CSS custom properties for the design system (`base.css`), scoped component styles (`app.css`), landing-page styles (`website.css`). No preprocessor.
- **Vanilla JS** — one global `S` state object, a top-level `render()` router, template-literal HTML strings assigned via `innerHTML`, event wiring via `setTimeout(wireXEvents, 0)` after each render.
- **No build step** — no npm, no Vite, no bundler, no transpiler. Just open `app.html`.

---

## Project Structure

```
curdun-ict-ERP-system/
├── index.html          # Marketing landing page
├── app.html            # Cor Platform application shell
├── css/
│   ├── base.css        # Design system: CSS variables, resets, buttons, forms, tables
│   ├── app.css         # Component styles for Super/Workspace/Pharmacy/POS + responsive
│   └── website.css     # Marketing-site-only styles
├── js/
│   └── app.js          # Entire application: state, render, seed data, event handlers
└── assets/             # Logo and images
```

---

## Design System

- **Colors** — Deep purple (`#2D1859`), gold accent (`#F5C411`), Somalia-inspired palette.
- **Typography** — Inter / system sans for UI, monospace for numbers, IDs and technical data.
- **Radius** — 8px controls, 12–16px cards, 24px featured cards.
- **Elevation** — Subtle 4px shadow on primary buttons, floating tab bar shadow on mobile.

All tokens are exposed as CSS variables in `css/base.css` so a rebrand only touches one file.

---

## What's Distinctive

- **Full RBAC flow verified end-to-end**: login → PIN auth → role-filtered sidebar → role-specific dashboard → staff creation with credentials → new user can immediately authenticate.
- **Two-tier auth model** — matches how real retail POS + backoffice systems separate concerns (fast PIN on the shared cashier tablet, personal email/password for remote admin access).
- **Force-change temp password flow** — the way real SaaS platforms provision new company admins.
- **Mobile-first responsive** — the entire ERP is usable on a phone, not just the marketing page.

---

## Author

**Abdisharma Hassan** ([@Sharmasheeno](https://github.com/Sharmasheeno))

Curdun ICT Solution — built as a portfolio demonstration of a complete Somali multi-tenant business platform frontend.

---

## License

© 2026 Curdun ICT Solution. All rights reserved.

