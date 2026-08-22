-- Six Odoo-inspired POS configuration profiles over the shared Curdun POS engine.
-- This is additive and idempotent. Existing single-register installations become Retail.

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='pos_configs' AND column_name='profile_type');
SET @column_sql = IF(@column_exists=0,"ALTER TABLE pos_configs ADD COLUMN profile_type ENUM('clothes','furniture','bakery','restaurant','bar','retail') NOT NULL DEFAULT 'retail' AFTER name",'SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='pos_configs' AND column_name='description');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE pos_configs ADD COLUMN description VARCHAR(500) NULL AFTER profile_type','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='pos_configs' AND column_name='default_screen');
SET @column_sql = IF(@column_exists=0,"ALTER TABLE pos_configs ADD COLUMN default_screen ENUM('register','tables') NOT NULL DEFAULT 'register' AFTER description",'SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='pos_configs' AND column_name='capabilities');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE pos_configs ADD COLUMN capabilities JSON NULL AFTER default_screen','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;

UPDATE pos_configs
SET profile_type='retail',
    name=CASE WHEN name LIKE '%Retail%' THEN name ELSE CONCAT(COALESCE(NULLIF(SUBSTRING_INDEX(name,' Register',1),''),'Main'),' Retail') END,
    description='Any shop: barcode sales, inventory, customers, discounts, returns and delivery',
    default_screen='register',
    capabilities=JSON_OBJECT('barcode',true,'stock',true,'variants',false,'combos',false,'preparation',false,'tables',false,'tabs',false,'split_bills',false,'tips',false,'ship_later',true,'self_order',false,'discounts',true,'pricelists',true)
WHERE profile_type='retail';

SET @index_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='pos_configs' AND index_name='pos_config_company_branch_profile');
SET @index_sql = IF(@index_exists=0,'ALTER TABLE pos_configs ADD UNIQUE KEY pos_config_company_branch_profile (company_id,branch_id,profile_type)','SELECT 1'); PREPARE index_stmt FROM @index_sql; EXECUTE index_stmt; DEALLOCATE PREPARE index_stmt;
-- Add the replacement first. The original key may currently be the index
-- InnoDB uses for the company/branch foreign keys and cannot be dropped until
-- another compatible left-prefix index exists.
SET @index_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='pos_configs' AND index_name='pos_config_company_branch');
SET @index_sql = IF(@index_exists>0,'ALTER TABLE pos_configs DROP INDEX pos_config_company_branch','SELECT 1'); PREPARE index_stmt FROM @index_sql; EXECUTE index_stmt; DEALLOCATE PREPARE index_stmt;

INSERT INTO pos_configs (company_id,branch_id,name,profile_type,description,default_screen,capabilities)
SELECT b.company_id,b.id,CONCAT(b.name,' ',profiles.title),profiles.profile_type,profiles.description,profiles.default_screen,profiles.capabilities
FROM branches b
JOIN company_modules cm ON cm.company_id=b.company_id AND cm.module_key='pos' AND cm.status='active'
JOIN (
    SELECT 'clothes' profile_type,'Clothes' title,'Colors, sizes, styles and per-variant stock' description,'register' default_screen,
      JSON_OBJECT('barcode',true,'stock',true,'variants',true,'combos',false,'preparation',false,'tables',false,'tabs',false,'split_bills',false,'tips',false,'ship_later',false,'self_order',false,'discounts',true,'pricelists',true) capabilities
    UNION ALL SELECT 'furniture','Furniture','Product options, stock, replenishment, discounts and scheduled delivery','register',
      JSON_OBJECT('barcode',true,'stock',true,'variants',true,'combos',false,'preparation',false,'tables',false,'tabs',false,'split_bills',false,'tips',false,'ship_later',true,'self_order',false,'discounts',true,'pricelists',true)
    UNION ALL SELECT 'bakery','Bakery','Food over the counter, weighted items, combos and preparation','register',
      JSON_OBJECT('barcode',true,'stock',true,'variants',false,'combos',true,'preparation',true,'tables',false,'tabs',false,'split_bills',false,'tips',false,'ship_later',false,'self_order',true,'discounts',true,'pricelists',true)
    UNION ALL SELECT 'restaurant','Restaurant','Floors, tables, guests, courses, kitchen tickets and split bills','tables',
      JSON_OBJECT('barcode',false,'stock',true,'variants',false,'combos',true,'preparation',true,'tables',true,'tabs',true,'split_bills',true,'tips',true,'ship_later',false,'self_order',true,'discounts',true,'pricelists',true)
    UNION ALL SELECT 'bar','Bar','Open tabs, tables, drink preparation, split bills and tips','tables',
      JSON_OBJECT('barcode',true,'stock',true,'variants',false,'combos',true,'preparation',true,'tables',true,'tabs',true,'split_bills',true,'tips',true,'ship_later',false,'self_order',true,'discounts',true,'pricelists',true)
    UNION ALL SELECT 'retail','Retail','Any shop: barcode sales, inventory, customers, discounts, returns and delivery','register',
      JSON_OBJECT('barcode',true,'stock',true,'variants',false,'combos',false,'preparation',false,'tables',false,'tabs',false,'split_bills',false,'tips',false,'ship_later',true,'self_order',false,'discounts',true,'pricelists',true)
) profiles
WHERE b.deleted_at IS NULL AND b.status='active'
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),default_screen=VALUES(default_screen),capabilities=VALUES(capabilities),active=1;

CREATE TABLE IF NOT EXISTS pos_floors (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NOT NULL,
    config_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY pos_floor_config_name (config_id,name),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (config_id) REFERENCES pos_configs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_tables (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NOT NULL,
    config_id BIGINT UNSIGNED NOT NULL,
    floor_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(80) NOT NULL,
    seats INT UNSIGNED NOT NULL DEFAULT 4,
    shape ENUM('square','round') NOT NULL DEFAULT 'square',
    status ENUM('available','occupied','reserved') NOT NULL DEFAULT 'available',
    sort_order INT NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY pos_table_floor_name (floor_id,name),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (config_id) REFERENCES pos_configs(id) ON DELETE CASCADE,
    FOREIGN KEY (floor_id) REFERENCES pos_floors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_preparation_stages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NOT NULL,
    config_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    stage_code ENUM('to_prepare','ready','completed') NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    color VARCHAR(20) NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY pos_prep_config_stage (config_id,stage_code),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (config_id) REFERENCES pos_configs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_product_variants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(200) NOT NULL,
    attributes JSON NOT NULL,
    sku VARCHAR(100) NULL,
    barcode VARCHAR(100) NULL,
    price_extra DECIMAL(15,2) NOT NULL DEFAULT 0,
    stock_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY pos_variant_product_name (product_id,name),
    UNIQUE KEY pos_variant_company_barcode (company_id,barcode),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_combo_choices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    maximum_items INT UNSIGNED NOT NULL DEFAULT 1,
    required TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_combo_choice_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    choice_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    extra_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY pos_combo_choice_product (choice_id,product_id),
    FOREIGN KEY (choice_id) REFERENCES pos_combo_choices(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_preparation_tickets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NOT NULL,
    config_id BIGINT UNSIGNED NOT NULL,
    order_id BIGINT UNSIGNED NOT NULL,
    table_id BIGINT UNSIGNED NULL,
    stage_id BIGINT UNSIGNED NOT NULL,
    ticket_number VARCHAR(80) NOT NULL,
    notes VARCHAR(1000) NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ready_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    UNIQUE KEY pos_preparation_order (order_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (config_id) REFERENCES pos_configs(id) ON DELETE RESTRICT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (table_id) REFERENCES pos_tables(id) ON DELETE SET NULL,
    FOREIGN KEY (stage_id) REFERENCES pos_preparation_stages(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='orders' AND column_name='pos_config_id');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE orders ADD COLUMN pos_config_id BIGINT UNSIGNED NULL AFTER pos_session_id','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='orders' AND column_name='pos_table_id');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE orders ADD COLUMN pos_table_id BIGINT UNSIGNED NULL AFTER pos_config_id','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='orders' AND column_name='service_mode');
SET @column_sql = IF(@column_exists=0,"ALTER TABLE orders ADD COLUMN service_mode ENUM('counter','dine_in','takeaway','delivery','ship_later') NOT NULL DEFAULT 'counter' AFTER pos_table_id",'SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='orders' AND column_name='guest_count');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE orders ADD COLUMN guest_count INT UNSIGNED NULL AFTER service_mode','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='orders' AND column_name='tab_name');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE orders ADD COLUMN tab_name VARCHAR(150) NULL AFTER guest_count','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='orders' AND column_name='shipping_date');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE orders ADD COLUMN shipping_date DATE NULL AFTER tab_name','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='orders' AND column_name='tip_amount');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE orders ADD COLUMN tip_amount DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER shipping_date','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='order_items' AND column_name='variant_id');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE order_items ADD COLUMN variant_id BIGINT UNSIGNED NULL AFTER product_id','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;
SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='order_items' AND column_name='customer_note');
SET @column_sql = IF(@column_exists=0,'ALTER TABLE order_items ADD COLUMN customer_note VARCHAR(500) NULL AFTER variant_id','SELECT 1'); PREPARE column_stmt FROM @column_sql; EXECUTE column_stmt; DEALLOCATE PREPARE column_stmt;

INSERT INTO pos_floors (company_id,config_id,name,sort_order)
SELECT company_id,id,'Main Floor',10 FROM pos_configs WHERE profile_type IN ('restaurant','bar')
ON DUPLICATE KEY UPDATE active=1;

INSERT INTO pos_tables (company_id,config_id,floor_id,name,seats,sort_order)
SELECT f.company_id,f.config_id,f.id,CONCAT('T',n.n),CASE WHEN n.n IN (5,6) THEN 6 ELSE 4 END,n.n*10
FROM pos_floors f JOIN (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) n
WHERE f.active=1
ON DUPLICATE KEY UPDATE active=1;

INSERT INTO pos_preparation_stages (company_id,config_id,name,stage_code,sort_order,color)
SELECT pc.company_id,pc.id,stages.name,stages.stage_code,stages.sort_order,stages.color
FROM pos_configs pc
JOIN (
    SELECT 'To prepare' name,'to_prepare' stage_code,10 sort_order,'#F59E0B' color
    UNION ALL SELECT 'Ready','ready',20,'#22C55E'
    UNION ALL SELECT 'Completed','completed',30,'#6B7280'
) stages
WHERE pc.profile_type IN ('bakery','restaurant','bar')
ON DUPLICATE KEY UPDATE name=VALUES(name),sort_order=VALUES(sort_order),color=VALUES(color),active=1;
