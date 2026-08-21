-- ============================================================
-- P7 correction — classify cash movements by INTENT
--
-- Existing `movement_type` (IN/OUT) records the DIRECTION of cash. This
-- new `subtype` records the INTENT so reports can distinguish:
--   MANUAL     manual Cash In / Cash Out entered by the cashier
--   SETTLEMENT Cash from a Customer Account settlement
--
-- Expected Cash still sums every IN and OUT regardless of subtype; the
-- subtype is only for reporting/grouping. This preserves financial
-- correctness while matching Odoo's Customer Account UX (customer
-- settlement is not the same operation as a manual drawer top-up).
-- ============================================================

SET @col := (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema=DATABASE()
               AND table_name='pos_cash_movements'
               AND column_name='subtype');
SET @sql := IF(@col=0,
    "ALTER TABLE pos_cash_movements ADD COLUMN subtype VARCHAR(32) NOT NULL DEFAULT 'MANUAL' AFTER movement_type",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Historical rows created by the previous settlement path used the reason
-- "Customer Account settlement — customer #N". Backfill their subtype so
-- prior reporting sees the correct classification without a rewrite.
UPDATE pos_cash_movements
SET subtype = 'SETTLEMENT'
WHERE subtype = 'MANUAL' AND reason LIKE 'Customer Account settlement%';
