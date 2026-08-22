-- ============================================================
-- P13 - Backend idempotency for POS financial operations
--
-- Enforces: one intended financial operation == one committed result.
-- A DB unique constraint (not application SELECT) provides atomic
-- protection against concurrent duplicate requests.
--
-- Same key + same payload  -> replay original stored response.
-- Same key + different payload -> 409 IDEMPOTENCY_KEY_REUSED.
-- Different key             -> new operation (legitimate).
-- Cross-tenant: (company_id, action, idempotency_key) is unique per
-- company so Company B cannot collide with Company A's UUID and
-- cannot retrieve Company A's stored response.
-- ============================================================

CREATE TABLE IF NOT EXISTS pos_idempotency_keys (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id        BIGINT UNSIGNED NOT NULL,
    pos_config_id     BIGINT UNSIGNED NULL,
    session_id        BIGINT UNSIGNED NULL,
    action            VARCHAR(48)     NOT NULL,
    idempotency_key   VARCHAR(64)     NOT NULL,
    request_hash      VARCHAR(64)     NOT NULL,
    status            ENUM('PROCESSING','COMPLETED') NOT NULL DEFAULT 'PROCESSING',
    entity_type       VARCHAR(32)     NULL,
    entity_id         BIGINT UNSIGNED NULL,
    http_status       SMALLINT UNSIGNED NULL,
    response_data     JSON            NULL,
    created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at      TIMESTAMP       NULL,
    UNIQUE KEY uq_idempotency (company_id, action, idempotency_key),
    KEY idx_pik_status (status, created_at),
    KEY idx_pik_config (pos_config_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
