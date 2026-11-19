<?php
declare(strict_types=1);
namespace Optiman;

use PDO;

final class VariantCatalogMigration
{
    public function __construct(private PDO $db) {}

    private function column(string $table, string $name): array
    {
        $q = $this->db->prepare('SELECT COLUMN_TYPE,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?');
        $q->execute([$table,$name]);
        return $q->fetch(PDO::FETCH_ASSOC) ?: [];
    }

    private function indexColumns(string $table, string $name): array
    {
        $q = $this->db->prepare('SELECT COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=? ORDER BY SEQ_IN_INDEX');
        $q->execute([$table,$name]);
        return $q->fetchAll(PDO::FETCH_COLUMN);
    }

    // MySQL DDL commits implicitly. Each structural step checks the actual schema on retry.
    public function apply(): void
    {
        if (!str_contains($this->column('products','status')['COLUMN_TYPE'],"'draft'")) {
            $this->db->exec("ALTER TABLE products MODIFY status ENUM('active','inactive','draft') NOT NULL DEFAULT 'inactive'");
        }
        $this->db->exec("INSERT INTO product_variants(product_id,sku,color_name,price,tryon_asset,status,is_default)
            SELECT p.id,IF(taken.id IS NULL,p.sku,CONCAT('V2-',UUID())),COALESCE(NULLIF(p.color,''),'Original'),
            p.price,p.tryon_asset,IF(p.status='active','active','inactive'),1 FROM products p
            LEFT JOIN product_variants taken ON taken.sku=p.sku
            WHERE NOT EXISTS(SELECT 1 FROM product_variants own WHERE own.product_id=p.id)");
        $this->db->exec("UPDATE product_variants v JOIN
            (SELECT product_id,COALESCE(MIN(IF(status='active',id,NULL)),MIN(id)) choice
            FROM product_variants GROUP BY product_id HAVING MAX(is_default)=0) s
            ON v.id=s.choice SET v.is_default=1");
        $this->db->exec("UPDATE products p JOIN product_variants v ON v.product_id=p.id AND v.is_default=1
            SET p.color=v.color_name,p.price=v.price,p.tryon_asset=v.tryon_asset,
            p.status=IF(p.status='active' AND v.status='inactive','draft',p.status)");

        if (!$this->indexColumns('product_variants','uq_variant_parent')) {
            $this->db->exec('ALTER TABLE product_variants ADD UNIQUE KEY uq_variant_parent(product_id,id)');
        }
        foreach (['product_images','stock_balances','stock_movements'] as $table) {
            if (!$this->column($table,'variant_id')) $this->db->exec("ALTER TABLE $table ADD variant_id BIGINT UNSIGNED NULL");
            if ($this->column($table,'variant_id')['IS_NULLABLE'] === 'YES') {
                $this->db->exec("UPDATE $table t JOIN product_variants v ON v.product_id=t.product_id AND v.is_default=1 SET t.variant_id=v.id WHERE t.variant_id IS NULL");
                $this->db->exec("ALTER TABLE $table MODIFY variant_id BIGINT UNSIGNED NOT NULL");
            }
            $fk = 'fk_'.$table.'_variant';
            $q = $this->db->prepare('SELECT 1 FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME=? AND TABLE_NAME=?');
            $q->execute([$fk,$table]);
            if (!$q->fetchColumn()) $this->db->exec("ALTER TABLE $table ADD CONSTRAINT $fk FOREIGN KEY(product_id,variant_id) REFERENCES product_variants(product_id,id)");
        }
        if ($this->indexColumns('stock_balances','PRIMARY') !== ['variant_id','location_id']) {
            $this->db->exec('ALTER TABLE stock_balances DROP PRIMARY KEY, ADD PRIMARY KEY(variant_id,location_id)');
        }
        if (!$this->column('stock_movements','adjustment_key')) {
            $this->db->exec('ALTER TABLE stock_movements ADD adjustment_key CHAR(36) NULL, ADD UNIQUE KEY uq_stock_adjustment(adjustment_key), ADD adjustment_reason VARCHAR(200) NULL');
        }
    }

}
