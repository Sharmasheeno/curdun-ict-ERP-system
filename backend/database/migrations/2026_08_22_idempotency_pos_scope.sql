-- ============================================================
-- P13 fix - Include pos_config_id in the idempotency unique scope.
-- Prevents the same UUID accidentally colliding across two POS
-- configurations (e.g., Bakaara + Airport) in the same company.
-- ============================================================

-- pos_config_id was already nullable; treat NULL and 0 as a shared bucket.
UPDATE pos_idempotency_keys SET pos_config_id = 0 WHERE pos_config_id IS NULL;

-- Add the replacement before dropping the old key. The old unique index can
-- be the only index currently satisfying the company_id foreign key.
SET @has_new := (SELECT COUNT(*) FROM information_schema.statistics
                 WHERE table_schema=DATABASE() AND table_name='pos_idempotency_keys'
                   AND index_name='uq_idempotency_scoped');
SET @sql := IF(@has_new = 0,
    'ALTER TABLE pos_idempotency_keys ADD UNIQUE KEY uq_idempotency_scoped (company_id, pos_config_id, action, idempotency_key)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_old := (SELECT COUNT(*) FROM information_schema.statistics
                 WHERE table_schema=DATABASE() AND table_name='pos_idempotency_keys'
                   AND index_name='uq_idempotency');
SET @sql := IF(@has_old > 0, 'ALTER TABLE pos_idempotency_keys DROP INDEX uq_idempotency', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure pos_config_id has a NOT NULL default so future writes don't drift.
ALTER TABLE pos_idempotency_keys MODIFY COLUMN pos_config_id BIGINT UNSIGNED NOT NULL DEFAULT 0;
