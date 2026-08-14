-- ============================================================
-- Migration: customer credit (Deyn) ledger
-- Date: 2026-08-15
--
-- Prior state: Deyn increased customers.balance directly. That worked
-- for the total, but there was no auditable trail — you could not answer
-- "which orders make up this customer's outstanding $170?" or "who
-- collected the $30 EVC payment against the debt on Aug 12?".
--
-- New state: every Deyn transaction (sale, collection, refund reversal)
-- writes a signed row here. customer.balance = SUM(pos_credit_ledger.amount)
-- for that customer, always.
-- ============================================================

CREATE TABLE IF NOT EXISTS pos_credit_ledger (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id     BIGINT UNSIGNED NOT NULL,
    branch_id      BIGINT UNSIGNED NULL,          -- store where the event happened
    session_id     BIGINT UNSIGNED NULL,          -- pos_sessions.id
    customer_id    BIGINT UNSIGNED NOT NULL,
    order_id       BIGINT UNSIGNED NULL,          -- for DEYN_SALE + DEYN_REFUND_REVERSAL
    cashier_id     BIGINT UNSIGNED NULL,          -- the acting POS employee (dual-identity)
    type           ENUM('DEYN_SALE','DEYN_PAYMENT','DEYN_REFUND_REVERSAL','DEYN_ADJUSTMENT') NOT NULL,
    -- Signed amount. Positive = increases outstanding debt (sale).
    -- Negative = reduces outstanding debt (payment, refund reversal).
    amount         DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(64) NULL,              -- for DEYN_PAYMENT (Cash / EVC Plus / etc.)
    reference      VARCHAR(64) NULL,              -- order ref, txn id, or free-form note
    notes          TEXT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ledger_customer (customer_id, created_at),
    KEY idx_ledger_company_type (company_id, type, created_at),
    KEY idx_ledger_session (session_id),
    KEY idx_ledger_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
