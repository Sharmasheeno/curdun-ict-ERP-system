-- Password delivery channels and secure SMS OTP verification.
-- Safe to execute repeatedly on MySQL 8.

SET @channel_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema=DATABASE() AND table_name='password_resets' AND column_name='channel'
);
SET @channel_sql = IF(@channel_exists=0,
    "ALTER TABLE password_resets ADD COLUMN channel ENUM('email','sms') NOT NULL DEFAULT 'email' AFTER token",
    'SELECT 1');
PREPARE channel_stmt FROM @channel_sql; EXECUTE channel_stmt; DEALLOCATE PREPARE channel_stmt;

SET @otp_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema=DATABASE() AND table_name='password_resets' AND column_name='otp_hash'
);
SET @otp_sql = IF(@otp_exists=0,
    'ALTER TABLE password_resets ADD COLUMN otp_hash VARCHAR(255) NULL AFTER channel',
    'SELECT 1');
PREPARE otp_stmt FROM @otp_sql; EXECUTE otp_stmt; DEALLOCATE PREPARE otp_stmt;

SET @attempts_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema=DATABASE() AND table_name='password_resets' AND column_name='attempts'
);
SET @attempts_sql = IF(@attempts_exists=0,
    'ALTER TABLE password_resets ADD COLUMN attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER otp_hash',
    'SELECT 1');
PREPARE attempts_stmt FROM @attempts_sql; EXECUTE attempts_stmt; DEALLOCATE PREPARE attempts_stmt;

CREATE TABLE IF NOT EXISTS delivery_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    company_id BIGINT UNSIGNED NULL,
    purpose VARCHAR(50) NOT NULL,
    channel ENUM('email','sms') NOT NULL,
    destination VARCHAR(190) NOT NULL,
    status ENUM('sent','preview','failed') NOT NULL,
    provider_message VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_delivery_user_created (user_id,created_at),
    INDEX idx_delivery_company_created (company_id,created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
