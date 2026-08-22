-- CURDUN POS V2-P1: canonical multi-store capability foundation.
-- Additive only. Existing Retail configs and all historical sessions/orders remain unchanged.

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='pos_configs' AND column_name='store_type');
SET @column_sql = IF(@column_exists=0,"ALTER TABLE pos_configs ADD COLUMN store_type VARCHAR(32) NOT NULL DEFAULT 'retail' AFTER profile_type",'SELECT 1');
PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='pos_configs' AND column_name='capability_overrides');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE pos_configs ADD COLUMN capability_overrides JSON NULL AFTER capabilities','SELECT 1');
PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;

UPDATE pos_configs
SET store_type = CASE profile_type
    WHEN 'clothes' THEN 'fashion'
    WHEN 'furniture' THEN 'furniture_home'
    WHEN 'bakery' THEN 'bakery_food'
    WHEN 'restaurant' THEN 'restaurant'
    WHEN 'retail' THEN 'retail'
    ELSE 'retail'
END
WHERE store_type IS NULL OR store_type='' OR store_type='retail';

UPDATE pos_configs SET store_type='retail'
WHERE store_type NOT IN ('retail','bakery_food','fashion','furniture_home','restaurant','electronics');

