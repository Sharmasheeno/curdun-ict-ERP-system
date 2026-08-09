CREATE DATABASE IF NOT EXISTS curdun_erp;
USE curdun_erp;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS expense_categories;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS sales_return_items;
DROP TABLE IF EXISTS sales_returns;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS purchase_order_items;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS payment_methods;
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS warehouses;
DROP TABLE IF EXISTS taxes;
DROP TABLE IF EXISTS units;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS currencies;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. currencies
CREATE TABLE IF NOT EXISTS currencies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    exchange_rate DECIMAL(15,6) DEFAULT 1.000000,
    is_default TINYINT(1) DEFAULT 0,
    status ENUM('active','inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. companies
CREATE TABLE IF NOT EXISTS companies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(30),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Somalia',
    logo VARCHAR(255),
    status ENUM('active','inactive') DEFAULT 'active',
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. branches
CREATE TABLE IF NOT EXISTS branches (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    phone VARCHAR(30),
    status ENUM('active','inactive') DEFAULT 'active',
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. departments
CREATE TABLE IF NOT EXISTS departments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED,
    branch_id BIGINT UNSIGNED NULL,
    name VARCHAR(200) NOT NULL,
    status ENUM('active','inactive') DEFAULT 'active',
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. roles
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    is_system TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. permissions
CREATE TABLE IF NOT EXISTS permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    module VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. users
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NULL,
    branch_id BIGINT UNSIGNED NULL,
    department_id BIGINT UNSIGNED NULL,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(30),
    avatar VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255) NULL,
    pin_last_used_at TIMESTAMP NULL DEFAULT NULL,
    status ENUM('active','inactive','suspended') DEFAULT 'active',
    email_verified_at TIMESTAMP NULL DEFAULT NULL,
    last_login_at TIMESTAMP NULL DEFAULT NULL,
    last_login_ip VARCHAR(45),
    login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL DEFAULT NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. user_roles
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT UNSIGNED,
    role_id BIGINT UNSIGNED,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT UNSIGNED,
    permission_id BIGINT UNSIGNED,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. sessions
CREATE TABLE IF NOT EXISTS sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    payload TEXT,
    last_activity INT UNSIGNED,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. password_resets
CREATE TABLE IF NOT EXISTS password_resets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. customers
CREATE TABLE IF NOT EXISTS customers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NULL,
    customer_code VARCHAR(50) UNIQUE,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(150),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    company_name VARCHAR(200),
    credit_limit DECIMAL(15,2) DEFAULT 0.00,
    balance DECIMAL(15,2) DEFAULT 0.00,
    status ENUM('active','inactive') DEFAULT 'active',
    notes TEXT,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NULL,
    supplier_code VARCHAR(50) UNIQUE,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(150),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    company_name VARCHAR(200),
    balance DECIMAL(15,2) DEFAULT 0.00,
    status ENUM('active','inactive') DEFAULT 'active',
    notes TEXT,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. categories
CREATE TABLE IF NOT EXISTS categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NULL,
    parent_id BIGINT UNSIGNED NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status ENUM('active','inactive') DEFAULT 'active',
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. units
CREATE TABLE IF NOT EXISTS units (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NULL,
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(20),
    status ENUM('active','inactive') DEFAULT 'active',
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. taxes
CREATE TABLE IF NOT EXISTS taxes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rate DECIMAL(5,2) NOT NULL,
    type ENUM('percentage','fixed') DEFAULT 'percentage',
    status ENUM('active','inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. warehouses
CREATE TABLE IF NOT EXISTS warehouses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NULL,
    branch_id BIGINT UNSIGNED NULL,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    status ENUM('active','inactive') DEFAULT 'active',
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. products
CREATE TABLE IF NOT EXISTS products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NULL,
    category_id BIGINT UNSIGNED NULL,
    unit_id BIGINT UNSIGNED NULL,
    tax_id BIGINT UNSIGNED NULL,
    sku VARCHAR(100) UNIQUE,
    barcode VARCHAR(100),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    purchase_price DECIMAL(15,2) DEFAULT 0.00,
    selling_price DECIMAL(15,2) NOT NULL,
    wholesale_price DECIMAL(15,2) NULL DEFAULT NULL,
    minimum_stock DECIMAL(15,3) DEFAULT 0.000,
    current_stock DECIMAL(15,3) DEFAULT 0.000,
    image VARCHAR(255),
    status ENUM('active','inactive') DEFAULT 'active',
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
    FOREIGN KEY (tax_id) REFERENCES taxes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. stock_movements
CREATE TABLE IF NOT EXISTS stock_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NULL,
    user_id BIGINT UNSIGNED NULL,
    reference_type VARCHAR(50),
    reference_id BIGINT UNSIGNED,
    type ENUM('PURCHASE','SALE','RETURN','ADJUSTMENT','TRANSFER') NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    quantity_before DECIMAL(15,3) NOT NULL,
    quantity_after DECIMAL(15,3) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. payment_methods
CREATE TABLE IF NOT EXISTS payment_methods (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('cash','bank','mobile','other') DEFAULT 'cash',
    status ENUM('active','inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. purchase_orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NULL,
    supplier_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    reference_number VARCHAR(100) UNIQUE,
    status ENUM('DRAFT','PENDING','APPROVED','RECEIVED','CANCELLED') DEFAULT 'DRAFT',
    order_date DATE NOT NULL,
    expected_date DATE,
    received_date DATE,
    subtotal DECIMAL(15,2) DEFAULT 0.00,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    discount_amount DECIMAL(15,2) DEFAULT 0.00,
    total_amount DECIMAL(15,2) DEFAULT 0.00,
    paid_amount DECIMAL(15,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. purchase_order_items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    discount DECIMAL(15,2) DEFAULT 0.00,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    total DECIMAL(15,2) NOT NULL,
    received_quantity DECIMAL(15,3) DEFAULT 0.000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. orders
CREATE TABLE IF NOT EXISTS orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NULL,
    customer_id BIGINT UNSIGNED NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NULL,
    invoice_id BIGINT UNSIGNED NULL,
    reference_number VARCHAR(100) UNIQUE,
    status ENUM('DRAFT','PENDING','CONFIRMED','COMPLETED','CANCELLED') DEFAULT 'DRAFT',
    order_date DATE NOT NULL,
    subtotal DECIMAL(15,2) DEFAULT 0.00,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    discount_amount DECIMAL(15,2) DEFAULT 0.00,
    total_amount DECIMAL(15,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. order_items
CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    discount DECIMAL(15,2) DEFAULT 0.00,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    total DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. sales_returns
CREATE TABLE IF NOT EXISTS sales_returns (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    reference_number VARCHAR(100) UNIQUE,
    return_date DATE NOT NULL,
    reason TEXT,
    status ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
    total_amount DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. sales_return_items
CREATE TABLE IF NOT EXISTS sales_return_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sales_return_id BIGINT UNSIGNED NOT NULL,
    order_item_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    total DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sales_return_id) REFERENCES sales_returns(id) ON DELETE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. invoices
CREATE TABLE IF NOT EXISTS invoices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NULL,
    customer_id BIGINT UNSIGNED NULL,
    order_id BIGINT UNSIGNED NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    invoice_number VARCHAR(100) UNIQUE,
    status ENUM('DRAFT','SENT','PARTIAL','PAID','OVERDUE','CANCELLED') DEFAULT 'DRAFT',
    invoice_date DATE NOT NULL,
    due_date DATE,
    subtotal DECIMAL(15,2) DEFAULT 0.00,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    discount_amount DECIMAL(15,2) DEFAULT 0.00,
    total_amount DECIMAL(15,2) DEFAULT 0.00,
    paid_amount DECIMAL(15,2) DEFAULT 0.00,
    balance DECIMAL(15,2) DEFAULT 0.00,
    currency_id BIGINT UNSIGNED NULL,
    notes TEXT,
    terms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (currency_id) REFERENCES currencies(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update orders table to have the invoice_id foreign key constraint now that invoices is created
ALTER TABLE orders ADD FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- 28. invoice_items
CREATE TABLE IF NOT EXISTS invoice_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NULL,
    description VARCHAR(500),
    quantity DECIMAL(15,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    discount DECIMAL(15,2) DEFAULT 0.00,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    total DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 29. payments
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT UNSIGNED NOT NULL,
    company_id BIGINT UNSIGNED NULL,
    customer_id BIGINT UNSIGNED NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    payment_method_id BIGINT UNSIGNED NULL,
    reference_number VARCHAR(100),
    amount DECIMAL(15,2) NOT NULL,
    currency_id BIGINT UNSIGNED NULL,
    payment_date DATE NOT NULL,
    status ENUM('PENDING','COMPLETED','FAILED','REFUNDED') DEFAULT 'COMPLETED',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL,
    FOREIGN KEY (currency_id) REFERENCES currencies(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 30. expense_categories
CREATE TABLE IF NOT EXISTS expense_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status ENUM('active','inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 31. expenses
CREATE TABLE IF NOT EXISTS expenses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NULL,
    branch_id BIGINT UNSIGNED NULL,
    category_id BIGINT UNSIGNED NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    payment_method_id BIGINT UNSIGNED NULL,
    reference VARCHAR(100),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    expense_date DATE NOT NULL,
    status ENUM('pending','approved','rejected','paid') DEFAULT 'pending',
    receipt VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 32. notifications
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'info',
    is_read TINYINT(1) DEFAULT 0,
    read_at TIMESTAMP NULL DEFAULT NULL,
    data JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 33. settings
CREATE TABLE IF NOT EXISTS settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NULL,
    `key` VARCHAR(150) NOT NULL,
    value TEXT,
    type ENUM('string','integer','boolean','json') DEFAULT 'string',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_setting (company_id, `key`),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 34. audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    company_id BIGINT UNSIGNED NULL,
    module VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    record_id BIGINT UNSIGNED NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- SEED DATA
-- --------------------------------------------------------

-- Insert currencies
INSERT INTO currencies (code, name, symbol, exchange_rate, is_default, status) VALUES
('USD', 'US Dollar', '$', 1.000000, 1, 'active'),
('SOS', 'Somali Shilling', 'Sh', 570.000000, 0, 'active');

-- Insert payment_methods
INSERT INTO payment_methods (name, type, status) VALUES
('Cash', 'cash', 'active'),
('EVC Plus', 'mobile', 'active'),
('ZAAD', 'mobile', 'active'),
('Sahal', 'mobile', 'active'),
('Bank Transfer', 'bank', 'active');

-- Insert roles
INSERT INTO roles (name, display_name, description, is_system) VALUES
('superadmin', 'Super Admin', 'Full system access', 1),
('admin', 'Admin', 'Administrative access', 1),
('manager', 'Manager', 'Branch or department manager', 0),
('accountant', 'Accountant', 'Finance and accounting', 0),
('sales', 'Sales Rep', 'Sales and orders', 0),
('inventory', 'Inventory Manager', 'Stock management', 0),
('staff', 'Staff', 'Regular staff', 0);

-- Insert permissions
INSERT INTO permissions (module, name, display_name) VALUES
('users', 'users.view', 'View Users'),
('users', 'users.create', 'Create Users'),
('users', 'users.update', 'Update Users'),
('users', 'users.delete', 'Delete Users'),
('roles', 'roles.view', 'View Roles'),
('roles', 'roles.create', 'Create Roles'),
('roles', 'roles.update', 'Update Roles'),
('roles', 'roles.delete', 'Delete Roles'),
('companies', 'companies.view', 'View Companies'),
('companies', 'companies.create', 'Create Companies'),
('companies', 'companies.update', 'Update Companies'),
('companies', 'companies.delete', 'Delete Companies'),
('branches', 'branches.view', 'View Branches'),
('branches', 'branches.create', 'Create Branches'),
('branches', 'branches.update', 'Update Branches'),
('branches', 'branches.delete', 'Delete Branches'),
('departments', 'departments.view', 'View Departments'),
('departments', 'departments.create', 'Create Departments'),
('departments', 'departments.update', 'Update Departments'),
('departments', 'departments.delete', 'Delete Departments'),
('customers', 'customers.view', 'View Customers'),
('customers', 'customers.create', 'Create Customers'),
('customers', 'customers.update', 'Update Customers'),
('customers', 'customers.delete', 'Delete Customers'),
('suppliers', 'suppliers.view', 'View Suppliers'),
('suppliers', 'suppliers.create', 'Create Suppliers'),
('suppliers', 'suppliers.update', 'Update Suppliers'),
('suppliers', 'suppliers.delete', 'Delete Suppliers'),
('products', 'products.view', 'View Products'),
('products', 'products.create', 'Create Products'),
('products', 'products.update', 'Update Products'),
('products', 'products.delete', 'Delete Products'),
('categories', 'categories.view', 'View Categories'),
('categories', 'categories.create', 'Create Categories'),
('categories', 'categories.update', 'Update Categories'),
('categories', 'categories.delete', 'Delete Categories'),
('units', 'units.view', 'View Units'),
('units', 'units.create', 'Create Units'),
('units', 'units.update', 'Update Units'),
('units', 'units.delete', 'Delete Units'),
('warehouses', 'warehouses.view', 'View Warehouses'),
('warehouses', 'warehouses.create', 'Create Warehouses'),
('warehouses', 'warehouses.update', 'Update Warehouses'),
('warehouses', 'warehouses.delete', 'Delete Warehouses'),
('inventory', 'inventory.view', 'View Inventory'),
('inventory', 'inventory.create', 'Create Inventory'),
('inventory', 'inventory.update', 'Update Inventory'),
('inventory', 'inventory.adjust', 'Adjust Inventory'),
('purchases', 'purchases.view', 'View Purchases'),
('purchases', 'purchases.create', 'Create Purchases'),
('purchases', 'purchases.update', 'Update Purchases'),
('purchases', 'purchases.delete', 'Delete Purchases'),
('orders', 'orders.view', 'View Orders'),
('orders', 'orders.create', 'Create Orders'),
('orders', 'orders.update', 'Update Orders'),
('orders', 'orders.delete', 'Delete Orders'),
('orders', 'orders.complete', 'Complete Orders'),
('invoices', 'invoices.view', 'View Invoices'),
('invoices', 'invoices.create', 'Create Invoices'),
('invoices', 'invoices.update', 'Update Invoices'),
('invoices', 'invoices.delete', 'Delete Invoices'),
('payments', 'payments.view', 'View Payments'),
('payments', 'payments.create', 'Create Payments'),
('payments', 'payments.update', 'Update Payments'),
('payments', 'payments.delete', 'Delete Payments'),
('expenses', 'expenses.view', 'View Expenses'),
('expenses', 'expenses.create', 'Create Expenses'),
('expenses', 'expenses.update', 'Update Expenses'),
('expenses', 'expenses.delete', 'Delete Expenses'),
('reports', 'reports.view', 'View Reports'),
('settings', 'settings.manage', 'Manage Settings'),
('audit_logs', 'audit_logs.view', 'View Audit Logs');

-- Insert role_permissions
-- 1. Superadmin (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- 2. Admin (all except system internals)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions
WHERE module NOT IN ('roles', 'settings', 'audit_logs');

-- 3. Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions
WHERE (module IN ('customers', 'suppliers', 'products', 'orders', 'invoices', 'payments', 'expenses') AND name NOT LIKE '%.delete')
OR name = 'reports.view';

-- 4. Accountant
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions
WHERE module IN ('invoices', 'payments', 'expenses') OR name = 'reports.view';

-- 5. Sales
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions
WHERE module IN ('customers', 'orders') OR name = 'invoices.view';

-- 6. Inventory
INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions
WHERE module IN ('products', 'categories', 'units', 'warehouses', 'inventory', 'purchases');

-- 7. Staff
INSERT INTO role_permissions (role_id, permission_id)
SELECT 7, id FROM permissions
WHERE name IN ('customers.view', 'products.view', 'orders.view');

-- Insert companies
INSERT INTO companies (id, name, email, phone, city, country, status) VALUES
(1, 'CURDUN ICT Solutions', 'info@curdun.so', '+252615000000', 'Mogadishu', 'Somalia', 'active');

-- Insert default admin user
INSERT INTO users (id, company_id, name, email, password, status) VALUES
(1, 1, 'System Administrator', 'admin@curdun.so', '$2y$12$LCnHxpnfuDmcRNz.LSFU4.wS1dFV/1IKLQJiL1s8hHU8XOHGO6zS', 'active');

-- Assign superadmin role to admin user
INSERT INTO user_roles (user_id, role_id) VALUES (1, 1);
