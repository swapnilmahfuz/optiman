<?php
declare(strict_types=1);

namespace Optiman;

use InvalidArgumentException;
use PDO;
use RuntimeException;
use Throwable;

/** Owner-only product gallery operations. Authenticate actor server-side before calling. */
final class ImageManager
{
    public function __construct(private PDO $db, private ImageService $images, private int $maxImages = 5)
    {
        $this->maxImages = max(1, min(20, $maxImages));
    }

    public function list(array $actor, int $productId): array
    {
        $this->owner($actor);
        $q = $this->db->prepare('SELECT id, basename, is_primary, sort_order FROM product_images WHERE product_id=? ORDER BY sort_order,id');
        $q->execute([$productId]);
        return $q->fetchAll(PDO::FETCH_ASSOC);
    }

    public function upload(array $actor, int $productId, array $upload): array
    {
        $this->owner($actor);
        $base = null;
        $this->db->beginTransaction();
        try {
            $this->lockProduct($productId);
            $q = $this->db->prepare('SELECT COUNT(*) AS image_count, COALESCE(MAX(sort_order),-1)+1 AS next_order FROM product_images WHERE product_id=?');
            $q->execute([$productId]);
            $stats = $q->fetch(PDO::FETCH_ASSOC);
            $count = (int)$stats['image_count'];
            $nextOrder = (int)$stats['next_order'];
            if ($count >= $this->maxImages) throw new InvalidArgumentException('Maximum images reached for this product.');
            $base = $this->images->process($upload);
            $q = $this->db->prepare('INSERT INTO product_images (product_id,basename,is_primary,sort_order) VALUES (?,?,?,?)');
            $q->execute([$productId, $base, $count === 0 ? 1 : 0, $nextOrder]);
            $id = (int)$this->db->lastInsertId();
            $this->audit($actor, 'image.upload', $productId, ['image_id' => $id]);
            $this->db->commit();
            return ['id' => $id, 'basename' => $base, 'is_primary' => $count === 0, 'sort_order' => $nextOrder];
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            if ($base !== null) {
                try { $this->images->delete($base); } catch (Throwable $cleanup) { error_log('Product image rollback cleanup failed.'); }
            }
            throw $e;
        }
    }

    public function reorder(array $actor, int $productId, array $imageIds): void
    {
        $this->owner($actor);
        $ids = [];
        foreach ($imageIds as $id) {
            if ((!is_int($id) && !(is_string($id) && ctype_digit($id))) || (int)$id < 1) throw new InvalidArgumentException('Invalid image order.');
            $ids[] = (int)$id;
        }
        if (count(array_unique($ids)) !== count($ids)) throw new InvalidArgumentException('Invalid image order.');
        $this->db->beginTransaction();
        try {
            $this->lockProduct($productId);
            $q = $this->db->prepare('SELECT id FROM product_images WHERE product_id=? ORDER BY id');
            $q->execute([$productId]);
            $existing = array_map('intval', $q->fetchAll(PDO::FETCH_COLUMN));
            $sorted = $ids;
            sort($sorted, SORT_NUMERIC);
            if ($existing !== $sorted) throw new InvalidArgumentException('Image order must include each product image once.');
            $q = $this->db->prepare('UPDATE product_images SET sort_order=? WHERE product_id=? AND id=?');
            foreach ($ids as $order => $id) $q->execute([$order, $productId, $id]);
            $this->audit($actor, 'image.reorder', $productId, ['count' => count($ids)]);
            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }

    public function setPrimary(array $actor, int $productId, int $imageId): void
    {
        $this->owner($actor);
        $this->db->beginTransaction();
        try {
            $this->lockProduct($productId);
            $q = $this->db->prepare('SELECT id FROM product_images WHERE product_id=? AND id=?');
            $q->execute([$productId, $imageId]);
            if (!$q->fetchColumn()) throw new InvalidArgumentException('Product image not found.');
            $q = $this->db->prepare('UPDATE product_images SET is_primary=(id=?) WHERE product_id=?');
            $q->execute([$imageId, $productId]);
            $this->audit($actor, 'image.primary', $productId, ['image_id' => $imageId]);
            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }

    public function delete(array $actor, int $productId, int $imageId): void
    {
        $this->owner($actor);
        $this->db->beginTransaction();
        try {
            $this->lockProduct($productId);
            $q = $this->db->prepare('SELECT basename,is_primary FROM product_images WHERE product_id=? AND id=?');
            $q->execute([$productId, $imageId]);
            $image = $q->fetch(PDO::FETCH_ASSOC);
            if (!$image) throw new InvalidArgumentException('Product image not found.');
            $q = $this->db->prepare('DELETE FROM product_images WHERE product_id=? AND id=?');
            $q->execute([$productId, $imageId]);
            if ((int)$image['is_primary'] === 1) {
                $q = $this->db->prepare('SELECT id FROM product_images WHERE product_id=? ORDER BY sort_order,id LIMIT 1');
                $q->execute([$productId]);
                $next = $q->fetchColumn();
                if ($next !== false) {
                    $q = $this->db->prepare('UPDATE product_images SET is_primary=1 WHERE product_id=? AND id=?');
                    $q->execute([$productId, $next]);
                }
            }
            $this->audit($actor, 'image.delete', $productId, ['image_id' => $imageId]);
            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
        // Commit first so a rollback cannot leave a referenced image missing. If deletion
        // fails the orphan remains private to the generated upload folder for maintenance.
        try { $this->images->delete($image['basename']); } catch (Throwable $e) { error_log('Product image cleanup failed.'); }
    }

    private function owner(array $actor): void
    {
        if (($actor['role'] ?? '') !== 'owner' || (int)($actor['id'] ?? 0) < 1) throw new RuntimeException('Forbidden.');
    }

    private function lockProduct(int $productId): void
    {
        $q = $this->db->prepare('SELECT id FROM products WHERE id=? FOR UPDATE');
        $q->execute([$productId]);
        if (!$q->fetchColumn()) throw new InvalidArgumentException('Product not found.');
    }

    private function audit(array $actor, string $action, int $productId, array $metadata): void
    {
        $q = $this->db->prepare('INSERT INTO audit_logs (actor_id,action,entity,entity_id,metadata) VALUES (?,?,?,?,?)');
        $q->execute([(int)$actor['id'], $action, 'product', $productId, json_encode($metadata, JSON_THROW_ON_ERROR)]);
    }
}
