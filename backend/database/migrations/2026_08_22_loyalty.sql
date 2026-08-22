-- ============================================================
-- P10 - Odoo 19 Loyalty / Discount Programs (Loyalty Points core)
--
-- Strictly separate from Customer Account/Deyn:
--   customer.balance         tracks money owed (Deyn)
--   customer.loyalty_points  tracks reward points
-- These NEVER touch each other. Ledgers live in different tables:
--   pos_credit_ledger        Deyn activity
--   pos_loyalty_ledger       Loyalty activity
--
-- This migration ships the Loyalty program-type only. Promotions,
-- Coupons, Gift Cards, and Buy-X-Get-Y are queued as remaining Odoo
-- differences per Rule (P10 Odoo-completeness) and land in follow-ups.
-- ============================================================

-- 1. Programs
CREATE TABLE IF NOT EXISTS pos_loyalty_programs (
    id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id           BIGINT UNSIGNED NOT NULL,
    name                 VARCHAR(120)    NOT NULL,
    program_type         ENUM('LOYALTY','PROMOTION','COUPON','GIFT_CARD','BUY_X_GET_Y') NOT NULL DEFAULT 'LOYALTY',
    active               TINYINT(1)      NOT NULL DEFAULT 1,
    start_date           DATE            NULL,
    end_date             DATE            NULL,
    minimum_purchase     DECIMAL(15,2)   NOT NULL DEFAULT 0.00,
    -- Simple "points per $1 of eligible amount" default rule; individual
    -- pos_loyalty_rules can override per product/category.
    points_per_currency  DECIMAL(10,4)   NOT NULL DEFAULT 1.0000,
    created_at           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_program_company_name (company_id, name),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Per-product / per-category eligibility rules (optional overrides)
CREATE TABLE IF NOT EXISTS pos_loyalty_rules (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    program_id     BIGINT UNSIGNED NOT NULL,
    product_id     BIGINT UNSIGNED NULL,
    category_id    BIGINT UNSIGNED NULL,
    min_amount     DECIMAL(15,2)   NOT NULL DEFAULT 0.00,
    min_quantity   DECIMAL(15,3)   NOT NULL DEFAULT 0.000,
    points_earned  DECIMAL(15,2)   NULL,          -- fixed points for the matching lines
    points_multiplier DECIMAL(10,4) NULL,          -- multiplier over program.points_per_currency
    `sequence`     INT             NOT NULL DEFAULT 100,
    active         TINYINT(1)      NOT NULL DEFAULT 1,
    created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_plr_program (program_id, active, `sequence`),
    FOREIGN KEY (program_id)  REFERENCES pos_loyalty_programs(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id)  REFERENCES products(id)             ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id)           ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Rewards a customer can redeem points for
CREATE TABLE IF NOT EXISTS pos_loyalty_rewards (
    id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    program_id         BIGINT UNSIGNED NOT NULL,
    name               VARCHAR(200)    NOT NULL,
    reward_type        ENUM('discount_percent','discount_amount','free_product') NOT NULL,
    points_cost        DECIMAL(15,2)   NOT NULL,
    discount_percent   DECIMAL(6,2)    NULL,
    discount_amount    DECIMAL(15,2)   NULL,
    reward_product_id  BIGINT UNSIGNED NULL,
    active             TINYINT(1)      NOT NULL DEFAULT 1,
    `sequence`         INT             NOT NULL DEFAULT 100,
    created_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_plw_program (program_id, active, `sequence`),
    FOREIGN KEY (program_id)        REFERENCES pos_loyalty_programs(id) ON DELETE CASCADE,
    FOREIGN KEY (reward_product_id) REFERENCES products(id)             ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Loyalty ledger - authoritative source of every point movement
CREATE TABLE IF NOT EXISTS pos_loyalty_ledger (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id     BIGINT UNSIGNED NOT NULL,
    customer_id    BIGINT UNSIGNED NOT NULL,
    program_id     BIGINT UNSIGNED NOT NULL,
    order_id       BIGINT UNSIGNED NULL,
    session_id     BIGINT UNSIGNED NULL,
    cashier_id     BIGINT UNSIGNED NULL,
    reward_id      BIGINT UNSIGNED NULL,
    type           ENUM('LOYALTY_EARN','LOYALTY_REDEEM','LOYALTY_REFUND_REVERSAL','LOYALTY_MANUAL') NOT NULL,
    -- signed: positive when the customer gains points, negative when they spend/lose them
    points         DECIMAL(15,2)   NOT NULL,
    balance_after  DECIMAL(15,2)   NOT NULL,
    notes          VARCHAR(500)    NULL,
    created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_pll_customer (customer_id, created_at),
    KEY idx_pll_order    (order_id),
    KEY idx_pll_session  (session_id),
    FOREIGN KEY (company_id)  REFERENCES companies(id)              ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id)              ON DELETE CASCADE,
    FOREIGN KEY (program_id)  REFERENCES pos_loyalty_programs(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Denormalised customer.loyalty_points balance (must equal SUM(ledger))
SET @col := (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema=DATABASE() AND table_name='customers' AND column_name='loyalty_points');
SET @sql := IF(@col=0,
    "ALTER TABLE customers ADD COLUMN loyalty_points DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER pricelist_id",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. Order snapshot columns for historical integrity (Rule #10)
SET @col := (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema=DATABASE() AND table_name='orders' AND column_name='loyalty_points_earned');
SET @sql := IF(@col=0,
    "ALTER TABLE orders
        ADD COLUMN loyalty_points_earned   DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER pricelist_name,
        ADD COLUMN loyalty_points_redeemed DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER loyalty_points_earned,
        ADD COLUMN loyalty_reward_id       BIGINT UNSIGNED NULL AFTER loyalty_points_redeemed,
        ADD COLUMN loyalty_discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER loyalty_reward_id",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 7. Seed default LOYALTY program + reward per company
INSERT IGNORE INTO pos_loyalty_programs
    (company_id, name, program_type, points_per_currency)
SELECT id, 'Curdun Loyalty', 'LOYALTY', 1.0000 FROM companies;

INSERT IGNORE INTO pos_loyalty_rewards
    (program_id, name, reward_type, points_cost, discount_amount)
SELECT p.id, '$5 Off (50 points)', 'discount_amount', 50.00, 5.00
FROM pos_loyalty_programs p
WHERE p.name = 'Curdun Loyalty' AND p.program_type='LOYALTY';

INSERT IGNORE INTO pos_loyalty_rewards
    (program_id, name, reward_type, points_cost, discount_percent)
SELECT p.id, '10% Off (100 points)', 'discount_percent', 100.00, 10.00
FROM pos_loyalty_programs p
WHERE p.name = 'Curdun Loyalty' AND p.program_type='LOYALTY';
