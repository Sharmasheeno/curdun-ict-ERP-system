-- V2-P4 Fashion variants. Additive: historical Retail rows remain NULL/non-variant.
CREATE TABLE IF NOT EXISTS product_attributes (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT UNSIGNED NOT NULL,
 name VARCHAR(100) NOT NULL,
 active TINYINT(1) NOT NULL DEFAULT 1,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY product_attribute_company_name (company_id,name),
 FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_attribute_values (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 attribute_id BIGINT UNSIGNED NOT NULL,
 value VARCHAR(100) NOT NULL,
 sort_order INT NOT NULL DEFAULT 0,
 active TINYINT(1) NOT NULL DEFAULT 1,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY product_attribute_value_unique (attribute_id,value),
 FOREIGN KEY (attribute_id) REFERENCES product_attributes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_variant_values (
 variant_id BIGINT UNSIGNED NOT NULL,
 attribute_value_id BIGINT UNSIGNED NOT NULL,
 PRIMARY KEY (variant_id,attribute_value_id),
 FOREIGN KEY (variant_id) REFERENCES pos_product_variants(id) ON DELETE RESTRICT,
 FOREIGN KEY (attribute_value_id) REFERENCES product_attribute_values(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @exists=(SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='pos_product_variants' AND column_name='minimum_stock');
SET @sql=IF(@exists=0,'ALTER TABLE pos_product_variants ADD COLUMN minimum_stock DECIMAL(15,3) NOT NULL DEFAULT 0 AFTER stock_quantity','SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @exists=(SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='order_items' AND column_name='variant_name_snapshot');
SET @sql=IF(@exists=0,'ALTER TABLE order_items ADD COLUMN variant_name_snapshot VARCHAR(200) NULL AFTER variant_id','SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @exists=(SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='order_items' AND column_name='variant_sku_snapshot');
SET @sql=IF(@exists=0,'ALTER TABLE order_items ADD COLUMN variant_sku_snapshot VARCHAR(100) NULL AFTER variant_name_snapshot','SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @exists=(SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='stock_movements' AND column_name='variant_id');
SET @sql=IF(@exists=0,'ALTER TABLE stock_movements ADD COLUMN variant_id BIGINT UNSIGNED NULL AFTER product_id','SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @exists=(SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='pos_product_variants' AND index_name='pos_variant_company_sku');
SET @sql=IF(@exists=0,'ALTER TABLE pos_product_variants ADD UNIQUE KEY pos_variant_company_sku (company_id,sku)','SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
