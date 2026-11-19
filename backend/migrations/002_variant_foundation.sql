-- Additive foundation only. This is NOT the complete Product Management V2 update.
-- No existing product, image, stock, user or configuration data is reset.
-- MariaDB DDL commits implicitly; inspect existing tables before retrying an interrupted migration.
CREATE TABLE IF NOT EXISTS product_variants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  sku VARCHAR(80) NOT NULL,
  color_name VARCHAR(100) NOT NULL,
  color_hex CHAR(7) CHARACTER SET ascii COLLATE ascii_bin NULL,
  price DECIMAL(12,2) NOT NULL,
  tryon_asset VARCHAR(255) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'inactive',
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  default_product_id BIGINT UNSIGNED AS (CASE WHEN is_default = 1 THEN product_id ELSE NULL END) STORED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_variant_sku (sku),
  UNIQUE KEY uq_variant_one_default (default_product_id),
  KEY idx_variant_product (product_id,id),
  CONSTRAINT fk_variant_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT chk_variant_price CHECK (price >= 0),
  CONSTRAINT chk_variant_default CHECK (is_default IN (0,1)),
  CONSTRAINT chk_variant_color_hex CHECK (color_hex IS NULL OR color_hex REGEXP '^#[0-9A-Fa-f]{6}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed suggestions only; retain any owner-defined category values and status.
INSERT IGNORE INTO categories (name,slug,is_active) VALUES
  ('Eyeglasses','eyeglasses',1),('Sunglasses','sunglasses',1),('Blue-Light Glasses','blue-light-glasses',1);
INSERT IGNORE INTO schema_migrations (version) VALUES ('002_variant_foundation');
