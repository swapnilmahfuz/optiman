<?php
declare(strict_types=1);
namespace Optiman;

use PDO;
use DomainException;
use InvalidArgumentException;
use Throwable;

final class ProductUpgrade
{
    private const VERSION = '003_variant_catalog';
    public function __construct(private PDO $db, private string $migrationDirectory) {}

    private function applied(string $version): bool
    {
        $q = $this->db->prepare('SELECT 1 FROM schema_migrations WHERE version=?');
        $q->execute([$version]);
        return (bool)$q->fetchColumn();
    }

    public function ready(): bool { return $this->applied(self::VERSION); }

    public function migrate(array $owner): void
    {
        if (($owner['role'] ?? '') !== 'owner') throw new DomainException('Owner access required.',403);
        $lock = $this->db->query("SELECT GET_LOCK(CONCAT('optiman-v2-',LEFT(SHA2(DATABASE(),256),40)),5)")->fetchColumn();
        if ((int)$lock !== 1) throw new DomainException('Another update is running. Retry shortly.',409);
        try {
            if ($this->ready()) return;
            if (!$this->applied('001_foundation')) throw new DomainException('A working Phase 1 installation is required.',409);
            if (!$this->applied('002_variant_foundation')) {
                $sql = file_get_contents($this->migrationDirectory.'/002_variant_foundation.sql');
                if ($sql === false) throw new \RuntimeException('Migration missing');
                foreach (explode(';',preg_replace('/^\s*--.*$/m','',$sql)) as $statement) {
                    if (trim($statement) !== '') $this->db->exec($statement);
                }
            }
            require_once $this->migrationDirectory.'/003_variant_catalog.php';
            (new VariantCatalogMigration($this->db))->apply();
            $this->db->beginTransaction();
            $q = $this->db->prepare('INSERT INTO audit_logs(actor_id,action,entity) VALUES (?, ?, ?)');
            $q->execute([$owner['id'],'migration.apply',self::VERSION]);
            $q = $this->db->prepare('INSERT INTO schema_migrations(version) VALUES (?)');
            $q->execute([self::VERSION]);
            $this->db->commit();
        } finally {
            if ($this->db->inTransaction()) $this->db->rollBack();
            $this->db->query("SELECT RELEASE_LOCK(CONCAT('optiman-v2-',LEFT(SHA2(DATABASE(),256),40)))");
        }
    }

    public function reset(array $owner, mixed $confirmation, ImageService $images): array
    {
        if (($owner['role'] ?? '') !== 'owner') throw new DomainException('Owner access required.',403);
        if ($confirmation !== 'RESET DEMO CATALOG') throw new InvalidArgumentException('Type RESET DEMO CATALOG to confirm.');
        if (!$this->ready()) throw new DomainException('Apply the catalog update first.',409);
        $this->db->beginTransaction();
        try {
            // Range locks also prevent new parents or gallery entries during cleanup.
            $this->db->query('SELECT id FROM products ORDER BY id FOR UPDATE')->fetchAll();
            $bases = $this->db->query('SELECT basename FROM product_images FOR UPDATE')->fetchAll(PDO::FETCH_COLUMN);
            foreach (['stock_movements','stock_balances','product_images','product_variants','products'] as $table) {
                $this->db->exec("DELETE FROM $table");
            }
            $q = $this->db->prepare("INSERT INTO audit_logs(actor_id,action,entity) VALUES (?,'catalog.demo_reset','catalog')");
            $q->execute([$owner['id']]);
            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
        $pending = 0;
        foreach ($bases as $base) {
            try { $images->delete($base); } catch (Throwable $e) { $pending++; }
        }
        return ['reset'=>true,'files_requiring_cleanup'=>$pending];
    }
}
