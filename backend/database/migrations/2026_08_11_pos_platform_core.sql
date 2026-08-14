-- Retail POS + platform core. Safe to run more than once on the current MySQL 8 schema.

SET @must_change_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'must_change_password'
);
SET @must_change_sql = IF(
    @must_change_exists = 0,
    'ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER password',
    'SELECT 1'
);
PREPARE must_change_stmt FROM @must_change_sql;
EXECUTE must_change_stmt;
DEALLOCATE PREPARE must_change_stmt;

CREATE TABLE IF NOT EXISTS company_modules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NOT NULL,
    module_key VARCHAR(50) NOT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    starts_at DATE NULL,
    ends_at DATE NULL,
    settings JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY company_module_unique (company_id,module_key),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_shift_closures (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NOT NULL,
    branch_id BIGINT UNSIGNED NULL,
    cashier_id BIGINT UNSIGNED NOT NULL,
    closed_by BIGINT UNSIGNED NOT NULL,
    system_cash DECIMAL(15,2) NOT NULL DEFAULT 0,
    counted_cash DECIMAL(15,2) NOT NULL DEFAULT 0,
    variance DECIMAL(15,2) NOT NULL DEFAULT 0,
    notes VARCHAR(500) NULL,
    closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_pos_shift_company_date (company_id,closed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_stock_alerts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    severity ENUM('low','out') NOT NULL,
    current_stock DECIMAL(15,3) NOT NULL DEFAULT 0,
    minimum_stock DECIMAL(15,3) NOT NULL DEFAULT 0,
    status ENUM('open','resolved') NOT NULL DEFAULT 'open',
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY pos_stock_alert_product (company_id,product_id),
    INDEX idx_pos_stock_alert_status (company_id,status,severity),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_stock_alert_reads (
    alert_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (alert_id,user_id),
    FOREIGN KEY (alert_id) REFERENCES pos_stock_alerts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (name,display_name,description,is_system) VALUES
('store_manager','Store Manager','Manages a subscribed Retail POS store',1),
('senior_cashier','Senior Cashier','Senior Retail POS cashier',1),
('cashier','Cashier','Retail POS checkout user',1)
ON DUPLICATE KEY UPDATE display_name=VALUES(display_name),description=VALUES(description);

-- Subscriptions are deliberately not granted here. Provision them per tenant
-- through the Super Admin console or the Retail POS seeder.
