-- ============================================================
-- P8 — Odoo-style Payment Method configuration metadata
--
-- Adds the fields Odoo 19 attaches to a payment method beyond its display
-- name, so financial code can key on TYPE + INTEGRATION + IDENTIFY_CUSTOMER
-- rather than string-matching on the label.
-- ============================================================

SET @col := (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema=DATABASE() AND table_name='payment_methods' AND column_name='integration_type');
SET @sql := IF(@col=0,
    "ALTER TABLE payment_methods ADD COLUMN integration_type VARCHAR(32) NOT NULL DEFAULT 'MANUAL' AFTER type",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema=DATABASE() AND table_name='payment_methods' AND column_name='identify_customer');
SET @sql := IF(@col=0,
    "ALTER TABLE payment_methods ADD COLUMN identify_customer TINYINT(1) NOT NULL DEFAULT 0 AFTER integration_type",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema=DATABASE() AND table_name='payment_methods' AND column_name='sequence');
SET @sql := IF(@col=0,
    "ALTER TABLE payment_methods ADD COLUMN `sequence` INT NOT NULL DEFAULT 100 AFTER identify_customer",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Widen the type enum so 'credit' (Customer Account) is a valid value.
ALTER TABLE payment_methods MODIFY COLUMN type ENUM('cash','bank','mobile','credit','other') NOT NULL DEFAULT 'cash';

-- Backfill: known Curdun methods get correct metadata.
UPDATE payment_methods SET type='cash',   integration_type='NONE',   identify_customer=0, `sequence`=10 WHERE LOWER(name)='cash';
UPDATE payment_methods SET type='mobile', integration_type='MANUAL', identify_customer=0, `sequence`=20 WHERE LOWER(name)='evc plus';
UPDATE payment_methods SET type='mobile', integration_type='MANUAL', identify_customer=0, `sequence`=30 WHERE LOWER(name)='zaad';
UPDATE payment_methods SET type='mobile', integration_type='MANUAL', identify_customer=0, `sequence`=40 WHERE LOWER(name)='edahab';
UPDATE payment_methods SET type='mobile', integration_type='MANUAL', identify_customer=0, `sequence`=50 WHERE LOWER(name)='sahal';
-- Deyn ← the Customer Account method: type='credit' + must identify customer.
-- The refund/checkout/settlement paths key on type+identify_customer, so
-- renaming Deyn to "Customer Account" or anything else will not break behaviour.
UPDATE payment_methods SET type='credit', integration_type='MANUAL', identify_customer=1, `sequence`=90 WHERE LOWER(name)='deyn';
