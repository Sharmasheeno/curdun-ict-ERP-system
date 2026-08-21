-- ============================================================
-- Migration: action-scoped one-time Manager PIN approvals
-- Date: 2026-08-15
--
-- Prior behaviour: /auth/manager-approval verified a manager's PIN and
-- returned only { approved_by }. Nothing bound that approval to the
-- specific restricted action being requested — a compromised frontend
-- could reuse the "success" signal for any action.
--
-- New behaviour: each approval is persisted as a single-use token bound
-- to { action, target_type, target_id, amount, session_id, cashier,
-- manager, expires_at, status }. Restricted endpoints (refund, void,
-- cash-out, close-with-variance, discount override) require the caller
-- to pass an X-Manager-Approval header. Backend looks the token up,
-- verifies it matches the action + target + cashier + amount, checks
-- status='PENDING' AND expires_at > NOW(), marks it USED, and only then
-- allows the operation.
-- ============================================================

CREATE TABLE IF NOT EXISTS pos_manager_approvals (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id      BIGINT UNSIGNED NULL,
    token           VARCHAR(64)  NOT NULL,       -- 32 bytes hex, cryptographically random
    action          VARCHAR(64)  NOT NULL,       -- e.g. 'refund','void','cash-out','close-variance','discount-override'
    target_type     VARCHAR(32)  NULL,           -- 'order','session','product','line' — free-form scope hint
    target_id       BIGINT       NULL,           -- id of the record the approval is tied to (order id, session id, etc.)
    amount          DECIMAL(15,2) NULL,          -- amount context (refund $20, cash-out $50…) for audit
    session_id      BIGINT UNSIGNED NULL,        -- pos_sessions.id when relevant
    requested_by    BIGINT UNSIGNED NOT NULL,    -- users.id — the cashier who asked
    approved_by     BIGINT UNSIGNED NOT NULL,    -- users.id — the manager whose PIN cleared
    reason          TEXT         NULL,           -- audit note
    status          ENUM('PENDING','USED','EXPIRED','REVOKED') NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP, -- typically NOW() + 5 min; service always sets explicitly
    used_at         TIMESTAMP    NULL,
    used_ip         VARCHAR(45)  NULL,
    UNIQUE KEY uq_pos_manager_approvals_token (token),
    KEY idx_pma_lookup (status, action, target_id, session_id),
    KEY idx_pma_cashier (requested_by, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
