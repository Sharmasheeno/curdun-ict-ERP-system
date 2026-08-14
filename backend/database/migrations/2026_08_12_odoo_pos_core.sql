-- Odoo-style Retail POS register, order, payment and refund lifecycle.
-- Additive migration: the existing Curdun tables and UI remain compatible.

CREATE TABLE IF NOT EXISTS pos_configs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NOT NULL,
    branch_id BIGINT UNSIGNED NULL,
    name VARCHAR(200) NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    cash_control TINYINT(1) NOT NULL DEFAULT 1,
    opening_control TINYINT(1) NOT NULL DEFAULT 1,
    maximum_difference DECIMAL(15,2) NOT NULL DEFAULT 20.00,
    next_order_sequence BIGINT UNSIGNED NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY pos_config_company_branch (company_id,branch_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL,
    company_id BIGINT UNSIGNED NOT NULL,
    config_id BIGINT UNSIGNED NOT NULL,
    branch_id BIGINT UNSIGNED NULL,
    opened_by BIGINT UNSIGNED NOT NULL,
    closed_by BIGINT UNSIGNED NULL,
    state ENUM('OPENING_CONTROL','OPENED','CLOSING_CONTROL','CLOSED') NOT NULL DEFAULT 'OPENING_CONTROL',
    opening_cash DECIMAL(15,2) NOT NULL DEFAULT 0,
    expected_cash DECIMAL(15,2) NOT NULL DEFAULT 0,
    counted_cash DECIMAL(15,2) NULL,
    difference_amount DECIMAL(15,2) NULL,
    opening_note VARCHAR(500) NULL,
    closing_note VARCHAR(500) NULL,
    opened_at TIMESTAMP NULL DEFAULT NULL,
    closed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY pos_session_uuid (uuid),
    INDEX pos_session_open_user (company_id,opened_by,state),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (config_id) REFERENCES pos_configs(id) ON DELETE RESTRICT,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    FOREIGN KEY (opened_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_cash_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NOT NULL,
    session_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    movement_type ENUM('IN','OUT') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX pos_cash_movement_session (session_id,created_at),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES pos_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NOT NULL,
    session_id BIGINT UNSIGNED NOT NULL,
    order_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    payment_method_id BIGINT UNSIGNED NULL,
    method_name VARCHAR(100) NOT NULL,
    method_type ENUM('cash','bank','mobile','credit','other') NOT NULL DEFAULT 'other',
    amount DECIMAL(15,2) NOT NULL,
    is_change TINYINT(1) NOT NULL DEFAULT 0,
    reference_number VARCHAR(150) NULL,
    status ENUM('PENDING','COMPLETED','FAILED','REFUNDED') NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX pos_payment_order (order_id,status),
    INDEX pos_payment_session (session_id,method_type,status),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES pos_sessions(id) ON DELETE RESTRICT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='orders' AND column_name='pos_session_id');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE orders ADD COLUMN pos_session_id BIGINT UNSIGNED NULL AFTER warehouse_id','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='orders' AND column_name='uuid');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE orders ADD COLUMN uuid CHAR(36) NULL AFTER pos_session_id','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='orders' AND column_name='sequence_number');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE orders ADD COLUMN sequence_number BIGINT UNSIGNED NULL AFTER uuid','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='orders' AND column_name='pos_state');
SET @column_sql = IF(@column_exists=0,"ALTER TABLE orders ADD COLUMN pos_state ENUM('draft','paid','done','cancel') NULL AFTER status",'SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='orders' AND column_name='amount_paid');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE orders ADD COLUMN amount_paid DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER total_amount','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='orders' AND column_name='amount_return');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE orders ADD COLUMN amount_return DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER amount_paid','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='orders' AND column_name='to_invoice');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE orders ADD COLUMN to_invoice TINYINT(1) NOT NULL DEFAULT 0 AFTER amount_return','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='orders' AND column_name='refunded_order_id');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE orders ADD COLUMN refunded_order_id BIGINT UNSIGNED NULL AFTER to_invoice','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;

SET @index_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='orders' AND index_name='pos_order_company_uuid');
SET @index_sql = IF(@index_exists=0,'ALTER TABLE orders ADD UNIQUE KEY pos_order_company_uuid (company_id,uuid)','SELECT 1'); PREPARE index_stmt FROM @index_sql; EXECUTE index_stmt; DEALLOCATE PREPARE index_stmt;
SET @index_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='orders' AND index_name='pos_order_session_state');
SET @index_sql = IF(@index_exists=0,'ALTER TABLE orders ADD KEY pos_order_session_state (pos_session_id,pos_state)','SELECT 1'); PREPARE index_stmt FROM @index_sql; EXECUTE index_stmt; DEALLOCATE PREPARE index_stmt;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='order_items' AND column_name='line_uuid');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE order_items ADD COLUMN line_uuid CHAR(36) NULL AFTER order_id','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='order_items' AND column_name='discount_percent');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE order_items ADD COLUMN discount_percent DECIMAL(7,3) NOT NULL DEFAULT 0 AFTER discount','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='order_items' AND column_name='tax_rate');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE order_items ADD COLUMN tax_rate DECIMAL(7,3) NOT NULL DEFAULT 0 AFTER discount_percent','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='order_items' AND column_name='refunded_order_item_id');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE order_items ADD COLUMN refunded_order_item_id BIGINT UNSIGNED NULL AFTER tax_rate','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;

INSERT INTO pos_configs (company_id,branch_id,name)
SELECT b.company_id,b.id,CONCAT(b.name,' Register')
FROM branches b
JOIN company_modules cm ON cm.company_id=b.company_id AND cm.module_key='pos' AND cm.status='active'
WHERE b.deleted_at IS NULL AND b.status='active'
ON DUPLICATE KEY UPDATE name=VALUES(name),active=1;
