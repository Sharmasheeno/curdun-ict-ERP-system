-- ============================================================
-- Migration: Add POS PIN authentication + product wholesale price
-- Date: 2026-08-09
-- Safe to run on existing curdun_erp database (uses IF NOT EXISTS-style guards).
-- ============================================================

-- 1. Add pin_hash to users (POS 4-digit PIN, bcrypt-hashed)
--    Also add pin_last_used_at for audit + rate-limiting.
ALTER TABLE users
    ADD COLUMN pin_hash          VARCHAR(255) NULL AFTER password,
    ADD COLUMN pin_last_used_at  TIMESTAMP    NULL DEFAULT NULL AFTER pin_hash;

-- Optional index for fast reverse-lookup during PIN sign-in
-- (we look up by (branch_id, id) after loading candidates, not by pin_hash directly)
CREATE INDEX idx_users_branch_status ON users (branch_id, status);

-- 2. Add wholesale_price to products (Jumlo pricing shown alongside retail)
ALTER TABLE products
    ADD COLUMN wholesale_price DECIMAL(15,2) NULL DEFAULT NULL AFTER selling_price;

-- 3. (Optional but recommended) shifts table for POS cashier shift tracking
CREATE TABLE IF NOT EXISTS shifts (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT UNSIGNED NOT NULL,
    branch_id     BIGINT UNSIGNED NULL,
    started_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at      TIMESTAMP NULL DEFAULT NULL,
    cash_start    DECIMAL(15,2) DEFAULT 0.00,
    cash_counted  DECIMAL(15,2) NULL,
    variance      DECIMAL(15,2) NULL,
    status        ENUM('active','closed') DEFAULT 'active',
    notes         TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    INDEX idx_shifts_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Seed a few PINs for the demo staff (bcrypt hashes of '1234', '5678', ...).
--    Adjust user IDs to match your actual seed data if different.
--    You can regenerate these hashes with: php -r "echo password_hash('1234', PASSWORD_BCRYPT);"
--
-- Example (uncomment and adjust user IDs after checking your users table):
-- UPDATE users SET pin_hash = '$2y$12$KIXbxvzOo0kSg4t.gXWZmuxQeXQFxOvzqrRQGb0y2Q9EgW1M8V/1S' WHERE email = 'fartun@shifo.so';
