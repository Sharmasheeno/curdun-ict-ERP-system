-- ============================================================
-- P8.1 — Per-POS Payment Method Assignment
--
-- Odoo 19 assigns each payment method to specific Points of Sale rather
-- than making it globally available. Introduce the many-to-many join
-- so different POS configs (Bakaara vs Airport) can independently allow
-- Cash / EVC / ZAAD / Deyn.
--
-- Historical pos_payments rows are unaffected: they store method_name +
-- method_type at write time, so removing a method from a POS today does
-- not rewrite yesterday's receipts.
-- ============================================================

CREATE TABLE IF NOT EXISTS pos_config_payment_methods (
    id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pos_config_id      BIGINT UNSIGNED NOT NULL,
    payment_method_id  BIGINT UNSIGNED NOT NULL,
    `sequence`         INT             NOT NULL DEFAULT 100,
    enabled            TINYINT(1)      NOT NULL DEFAULT 1,
    created_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pos_config_payment_method (pos_config_id, payment_method_id),
    KEY idx_pcpm_config  (pos_config_id, enabled, `sequence`),
    KEY idx_pcpm_method  (payment_method_id),
    FOREIGN KEY (pos_config_id)     REFERENCES pos_configs(id)     ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backfill: for every existing pos_config, enable every active
-- payment_method. This preserves current behaviour (single-config
-- tenants keep working with every method available) while giving
-- multi-config tenants the correct starting point to customize.
INSERT IGNORE INTO pos_config_payment_methods
    (pos_config_id, payment_method_id, `sequence`, enabled)
SELECT pc.id, pm.id, pm.`sequence`, 1
FROM pos_configs pc
CROSS JOIN payment_methods pm
WHERE pm.status = 'active';
