-- ============================================================
-- P9 — Odoo 19 Flexible Pricelists
--
-- Introduces the four entities Odoo uses to price a POS order:
--   pos_pricelists           the pricelist (name, currency, active, sequence)
--   pos_pricelist_items      individual rules (product / category / all)
--   pos_config_pricelists    per-POS "available" + default assignment
--   customers.pricelist_id   customer's preferred pricelist
--
-- selling_price stays as the product's base list price. wholesale_price
-- is preserved as a column (rollback safety) but is migrated INTO a
-- generated "Wholesale" pricelist so the pricing engine becomes the
-- sole authority. Every order + order_item now snapshots the applied
-- pricing so Rule #10 historical integrity is preserved.
-- ============================================================

-- 1. pos_pricelists ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos_pricelists (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id  BIGINT UNSIGNED NOT NULL,
    name        VARCHAR(120)  NOT NULL,
    currency    VARCHAR(8)    NOT NULL DEFAULT 'USD',
    active      TINYINT(1)    NOT NULL DEFAULT 1,
    `sequence`  INT           NOT NULL DEFAULT 100,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pricelist_company_name (company_id, name),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. pos_pricelist_items ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pos_pricelist_items (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pricelist_id      BIGINT UNSIGNED NOT NULL,
    applies_to        ENUM('product','category','all') NOT NULL,
    product_id        BIGINT UNSIGNED NULL,
    category_id       BIGINT UNSIGNED NULL,
    min_quantity      DECIMAL(15,3)   NOT NULL DEFAULT 0.000,
    start_date        DATE            NULL,
    end_date          DATE            NULL,
    price_type        ENUM('fixed','discount') NOT NULL,
    fixed_price       DECIMAL(15,2)   NULL,
    discount_percent  DECIMAL(6,2)    NULL,
    `sequence`        INT             NOT NULL DEFAULT 100,
    active            TINYINT(1)      NOT NULL DEFAULT 1,
    created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ppi_pricelist (pricelist_id, active, `sequence`),
    KEY idx_ppi_product   (product_id),
    KEY idx_ppi_category  (category_id),
    FOREIGN KEY (pricelist_id) REFERENCES pos_pricelists(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id)   REFERENCES products(id)       ON DELETE CASCADE,
    FOREIGN KEY (category_id)  REFERENCES categories(id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. pos_config_pricelists (Available + Default per POS) --------------------
CREATE TABLE IF NOT EXISTS pos_config_pricelists (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pos_config_id  BIGINT UNSIGNED NOT NULL,
    pricelist_id   BIGINT UNSIGNED NOT NULL,
    is_default     TINYINT(1)      NOT NULL DEFAULT 0,
    `sequence`     INT             NOT NULL DEFAULT 100,
    created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pcpl_config_pricelist (pos_config_id, pricelist_id),
    KEY idx_pcpl_default (pos_config_id, is_default),
    FOREIGN KEY (pos_config_id) REFERENCES pos_configs(id)   ON DELETE CASCADE,
    FOREIGN KEY (pricelist_id)  REFERENCES pos_pricelists(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. customers.pricelist_id -------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema=DATABASE() AND table_name='customers' AND column_name='pricelist_id');
SET @sql := IF(@col=0,
    "ALTER TABLE customers ADD COLUMN pricelist_id BIGINT UNSIGNED NULL AFTER credit_limit",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- Optional FK if column exists but has no constraint
SET @fk := (SELECT COUNT(*) FROM information_schema.key_column_usage
            WHERE table_schema=DATABASE() AND table_name='customers'
              AND column_name='pricelist_id' AND referenced_table_name='pos_pricelists');
SET @sql := IF(@fk=0,
    "ALTER TABLE customers ADD CONSTRAINT fk_customer_pricelist FOREIGN KEY (pricelist_id) REFERENCES pos_pricelists(id) ON DELETE SET NULL",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. orders.pricelist_id + snapshot name ------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema=DATABASE() AND table_name='orders' AND column_name='pricelist_id');
SET @sql := IF(@col=0,
    "ALTER TABLE orders ADD COLUMN pricelist_id BIGINT UNSIGNED NULL AFTER pos_session_id, ADD COLUMN pricelist_name VARCHAR(120) NULL AFTER pricelist_id",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. order_items historical pricing snapshot columns ------------------------
--    base_price      = product.selling_price at the time of sale
--    pricelist_price = price the pricelist resolved to
--    manual_discount = amount OR percent-driven discount the cashier applied
--    unit_price      (existing) = final unit price actually charged
SET @col := (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema=DATABASE() AND table_name='order_items' AND column_name='base_price');
SET @sql := IF(@col=0,
    "ALTER TABLE order_items
        ADD COLUMN base_price       DECIMAL(15,2) NULL AFTER unit_price,
        ADD COLUMN pricelist_price  DECIMAL(15,2) NULL AFTER base_price,
        ADD COLUMN pricelist_item_id BIGINT UNSIGNED NULL AFTER pricelist_price",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 7. Seed per-company "Standard" + "Wholesale" pricelists -------------------
INSERT IGNORE INTO pos_pricelists (company_id, name, currency, `sequence`)
SELECT c.id, 'Standard', 'USD', 10 FROM companies c;
INSERT IGNORE INTO pos_pricelists (company_id, name, currency, `sequence`)
SELECT c.id, 'Wholesale', 'USD', 20 FROM companies c;

-- 8. Backfill: every existing product with a wholesale_price gets a fixed
--    'Wholesale' pricelist item so the pricing engine reproduces old behavior.
INSERT IGNORE INTO pos_pricelist_items
    (pricelist_id, applies_to, product_id, min_quantity, price_type, fixed_price, `sequence`)
SELECT pl.id, 'product', p.id, 0, 'fixed', p.wholesale_price, 100
FROM products p
JOIN pos_pricelists pl ON pl.company_id = p.company_id AND pl.name = 'Wholesale'
WHERE p.wholesale_price IS NOT NULL AND p.wholesale_price > 0;

-- 9. Assign both pricelists to every existing POS config, with Standard as default.
INSERT IGNORE INTO pos_config_pricelists (pos_config_id, pricelist_id, is_default, `sequence`)
SELECT pc.id, pl.id, 1, 10
FROM pos_configs pc
JOIN pos_pricelists pl ON pl.company_id = pc.company_id AND pl.name = 'Standard';
INSERT IGNORE INTO pos_config_pricelists (pos_config_id, pricelist_id, is_default, `sequence`)
SELECT pc.id, pl.id, 0, 20
FROM pos_configs pc
JOIN pos_pricelists pl ON pl.company_id = pc.company_id AND pl.name = 'Wholesale';
