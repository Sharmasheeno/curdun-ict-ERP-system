# Curdun Retail POS — Odoo-style logic contract

Curdun keeps its own purple/yellow UI, navigation, terminology, and tenant model. The POS domain beneath that UI follows the Odoo Retail POS lifecycle.

## Register lifecycle

1. A branch has one active `pos_config` (register configuration).
2. A cashier or manager opens the register with an opening cash balance.
3. Staff assigned to the branch use the same open register session.
4. Validated orders, payment lines, cash in/out operations, and refunds belong to that session.
5. Closing calculates expected cash from opening cash + cash payments + cash in - cash out.
6. A difference above `maximum_difference` requires explicit Store Manager/Admin approval.
7. A closed register is immutable and a new session must be opened before another sale.

## Order lifecycle

- New API orders use `draft -> paid -> done` semantics. The atomic checkout endpoint persists the final `done` state only after payment and stock validation succeed.
- The server reloads products, prices, tax, stock, payment configuration, and credit limits. Browser totals are never authoritative.
- Each browser checkout has a UUID. Retrying the same UUID returns the original result and never deducts stock twice.
- Paid/done orders are immutable. A completed sale is not edited or deleted.
- A refund creates a negative `done` order linked through `refunded_order_id`; refund lines point to their original lines and cannot exceed the remaining refundable quantity.
- A refund restores stock and creates a negative payment. If the original sale was invoiced, the refund creates a linked credit-note invoice record.

## Payments and accounting

- One order can contain multiple payment lines.
- Overpayment is accepted only when cash is included. Change is stored as a separate negative cash payment.
- `Deyn` is a customer-account payment method and therefore requires a customer.
- Ordinary paid walk-in sales create a receipt/order, not an accounting invoice. An invoice is created only for `to_invoice` orders or customer credit.
- Reports use positive orders, negative refund orders, and direct POS payment lines to calculate gross sales, refunds, net sales, tax, and payment-method totals.

## Scope

This contract covers Curdun's current **Retail POS** module: registers, checkout, products, customers, payments, receipts/invoices, stock, refunds, cash control, reporting, and staff access. Odoo restaurant tables, kitchen/preparation screens, IoT hardware, loyalty, gift cards, and e-commerce flows remain intentionally deferred until their Curdun modules are commissioned.

## Primary API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/v1/pos/session/current` | Current branch register/configuration |
| POST | `/api/v1/pos/sessions/open` | Open a register with opening cash |
| GET | `/api/v1/pos/sessions/{id}/summary` | Orders, payments, movements, expected cash |
| POST | `/api/v1/pos/sessions/{id}/cash-movements` | Record cash in/out with a reason |
| POST | `/api/v1/pos/sessions/{id}/close` | Reconcile and close a register |
| POST | `/api/v1/pos/checkout` | Idempotent validated order and payment |
| POST | `/api/v1/pos/orders/{id}/refund` | Full or line-level linked refund |

Deployments must apply `database/migrations/2026_08_12_odoo_pos_core.sql` after the base schema.
