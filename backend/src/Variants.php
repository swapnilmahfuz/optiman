<?php
declare(strict_types=1);
namespace Optiman;

use DomainException;
use InvalidArgumentException;
use PDO;
use Throwable;

final class Variants
{
    public function __construct(private PDO $db) {}

    // The caller owns a transaction and locks the parent before changing any variant.
    public function write(int $productId, array $input, ?int $id, bool $first = false): int
    {
        $q = $this->db->prepare('SELECT status FROM products WHERE id=? FOR UPDATE');
        $q->execute([$productId]);
        $parentStatus = $q->fetchColumn();
        if (!$parentStatus) throw new DomainException('Product not found.',404);
        $wasDefault = false;
        if ($id !== null) {
            $q = $this->db->prepare('SELECT is_default FROM product_variants WHERE id=? AND product_id=? FOR UPDATE');
            $q->execute([$id,$productId]);
            $old = $q->fetchColumn();
            if ($old === false) throw new DomainException('Variant not found for this product.',404);
            $wasDefault = (bool)$old;
        }
        foreach (['sku','color_name','color_hex','tryon_asset'] as $field) {
            if (isset($input[$field]) && !is_string($input[$field])) throw new InvalidArgumentException('Invalid variant field: '.$field);
        }
        $sku = trim($input['sku'] ?? '');
        if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/D',$sku)) throw new InvalidArgumentException('Enter a variant SKU of up to 80 letters, digits, dots, dashes or underscores.');
        $color = trim($input['color_name'] ?? '');
        if ($color === '' || mb_strlen($color)>100) throw new InvalidArgumentException('Enter a color name of 1–100 characters.');
        $hex = trim($input['color_hex'] ?? '');
        if ($hex !== '' && !preg_match('/^#[a-f0-9]{6}$/iD',$hex)) throw new InvalidArgumentException('Use a six-digit HEX color, such as #684530.');
        $price = (string)($input['price'] ?? '');
        if (!preg_match('/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/D',$price)) throw new InvalidArgumentException('Enter a non-negative BDT price with at most two decimal places.');
        $asset = trim($input['tryon_asset'] ?? '');
        if ($asset !== '' && (!preg_match('~^[a-z0-9][a-z0-9_./-]{0,254}$~iD',$asset) || str_contains($asset,'..'))) throw new InvalidArgumentException('Use a local, relative Try-On asset reference.');
        $status = $input['status'] ?? 'active';
        if (!in_array($status,['active','inactive'],true)) throw new InvalidArgumentException('Invalid variant status.');
        $default = $input['is_default'] ?? $wasDefault;
        if (!in_array($default,[true,false,0,1,'0','1'],true)) throw new InvalidArgumentException('Invalid default selection.');
        if ($wasDefault && !$default) throw new InvalidArgumentException('Set another variant as default first.');
        $default = $first || (bool)$default;
        if ($default && $parentStatus === 'active' && $status !== 'active') throw new InvalidArgumentException('A published product needs an active default. Choose another default first.');
        if ($default && !$wasDefault) {
            $this->db->prepare('UPDATE product_variants SET is_default=0 WHERE product_id=? AND is_default=1')->execute([$productId]);
        }
        $fields = [$sku,$color,$hex === '' ? null : $hex,$price,$asset === '' ? null : $asset,$status,(int)$default];
        if ($id === null) {
            $this->db->prepare('INSERT INTO product_variants(sku,color_name,color_hex,price,tryon_asset,status,is_default,product_id) VALUES(?,?,?,?,?,?,?,?)')->execute([...$fields,$productId]);
            $id = (int)$this->db->lastInsertId();
        } else {
            $this->db->prepare('UPDATE product_variants SET sku=?,color_name=?,color_hex=?,price=?,tryon_asset=?,status=?,is_default=? WHERE id=? AND product_id=?')->execute([...$fields,$id,$productId]);
        }
        if ($default) {
            $this->db->prepare('UPDATE products SET color=?,price=?,tryon_asset=? WHERE id=?')->execute([$color,$price,$asset === '' ? null : $asset,$productId]);
        }
        return $id;
    }

    public function save(array $owner, int $productId, array $input, ?int $id): int
    {
        if (($owner['role'] ?? '') !== 'owner') throw new DomainException('Owner access required.',403);
        $this->db->beginTransaction();
        try {
            $variantId = $this->write($productId,$input,$id);
            $q = $this->db->prepare("INSERT INTO audit_logs(actor_id,action,entity,entity_id) VALUES(?,?,'variant',?)");
            $q->execute([$owner['id'],$id === null ? 'variant.create' : 'variant.update',$variantId]);
            $this->db->commit();
            return $variantId;
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}
