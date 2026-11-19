<?php
declare(strict_types=1);
namespace Optiman;

use PDO;
use DomainException;
use InvalidArgumentException;
use Throwable;

final class VariantInventory
{
    public function __construct(private PDO $db) {}

    public function adjust(array $owner, int $variant, array $data): array
    {
        if (($owner['role'] ?? '') !== 'owner') throw new DomainException('Owner access required.',403);
        $location = filter_var($data['location_id'] ?? null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
        $delta = filter_var($data['quantity'] ?? null,FILTER_VALIDATE_INT,['options'=>['min_range'=>-2147483647,'max_range'=>2147483647]]);
        $reason = trim($data['reason'] ?? '');
        $key = $data['request_id'] ?? '';
        if (!$location || !$delta) throw new InvalidArgumentException('Choose a location and enter a non-zero whole quantity.');
        if ($reason === '' || mb_strlen($reason)>200) throw new InvalidArgumentException('Enter an adjustment reason of 1–200 characters.');
        if (!is_string($key) || !preg_match('/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iD',$key)) throw new InvalidArgumentException('An adjustment request ID is required.');
        $this->db->beginTransaction();
        try {
            $q = $this->db->prepare('SELECT product_id FROM product_variants WHERE id=? FOR UPDATE');
            $q->execute([$variant]);
            $product = $q->fetchColumn();
            if (!$product) throw new DomainException('Variant not found.',404);
            $q = $this->db->prepare('SELECT * FROM stock_movements WHERE adjustment_key=?');
            $q->execute([$key]);
            $previous = $q->fetch();
            if ($previous) {
                if ((int)$previous['variant_id']!==$variant || (int)$previous['location_id']!==$location ||
                    (int)$previous['quantity']!==$delta || (int)$previous['actor_id']!==(int)$owner['id'] || $previous['adjustment_reason']!==$reason) {
                    throw new DomainException('This request ID belongs to a different adjustment.',409);
                }
                $id = $previous['id'];
            } else {
                $q = $this->db->prepare('SELECT l.id FROM inventory_locations l LEFT JOIN branches b ON b.id=l.branch_id WHERE l.id=? AND l.is_active=1 AND (l.branch_id IS NULL OR b.is_active=1) FOR UPDATE');
                $q->execute([$location]);
                if (!$q->fetchColumn()) throw new InvalidArgumentException('Choose an active inventory location.');
                $this->db->prepare('INSERT INTO stock_balances(product_id,variant_id,location_id) VALUES(?,?,?) ON DUPLICATE KEY UPDATE on_hand=on_hand')->execute([$product,$variant,$location]);
                $q = $this->db->prepare('SELECT on_hand,reserved FROM stock_balances WHERE variant_id=? AND location_id=? FOR UPDATE');
                $q->execute([$variant,$location]);
                $balance = $q->fetch();
                $next = (int)$balance['on_hand'] + $delta;
                if ($next < (int)$balance['reserved'] || $next > 4294967295) throw new DomainException('Adjustment exceeds the available quantity or storage limit.',409);
                $this->db->prepare('UPDATE stock_balances SET on_hand=? WHERE variant_id=? AND location_id=?')->execute([$next,$variant,$location]);
                $this->db->prepare("INSERT INTO stock_movements(product_id,variant_id,location_id,quantity,movement_type,actor_id,adjustment_key,adjustment_reason) VALUES(?,?,?,?,'adjustment',?,?,?)")->execute([$product,$variant,$location,$delta,$owner['id'],$key,$reason]);
                $id = $this->db->lastInsertId();
            }
            $this->db->commit();
            return ['movement_id'=>(int)$id];
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function history(array $user, int $variant, int $before = 0): array
    {
        if (!in_array($user['role'] ?? '',['owner','branch_manager'],true)) throw new DomainException('Forbidden.',403);
        $args = [$variant];
        $filter = '';
        if ($user['role']==='branch_manager') {
            $filter = ' AND l.branch_id=?';
            $args[] = $user['branch_id'];
        }
        if ($before>0) { $filter.=' AND m.id<?'; $args[]=$before; }
        $q = $this->db->prepare("SELECT m.id,m.product_id,m.variant_id,m.location_id,l.branch_id,l.name AS location,m.quantity,
            m.movement_type,m.created_at,m.adjustment_reason,m.actor_id,u.name AS actor FROM stock_movements m
            JOIN inventory_locations l ON l.id=m.location_id LEFT JOIN users u ON u.id=m.actor_id
            WHERE m.variant_id=? $filter ORDER BY m.id DESC LIMIT 51");
        $q->execute($args);
        $rows = $q->fetchAll(PDO::FETCH_ASSOC);
        $more = count($rows)>50;
        if ($more) array_pop($rows);
        return ['items'=>$rows,'next_before'=>$more ? end($rows)['id'] : null];
    }

    public function addLocation(array $owner,array $data): int
    {
        if (($owner['role'] ?? '') !== 'owner') throw new DomainException('Owner access required.',403);
        $type = $data['type'] ?? '';
        $name = trim($data['name'] ?? '');
        $code = trim($data['code'] ?? '');
        if (!in_array($type,['branch','warehouse'],true) || $name==='' || mb_strlen($name)>120 || !preg_match('/^[a-z0-9][a-z0-9_-]{0,39}$/iD',$code)) throw new InvalidArgumentException('Enter a location name, type and unique alphanumeric code.');
        $this->db->beginTransaction();
        try {
            $branch = null;
            if ($type==='branch') {
                $q = $this->db->prepare('SELECT id,is_active FROM branches WHERE code=? FOR UPDATE');
                $q->execute([$code]);
                if ($existing = $q->fetch()) {
                    if (!(int)$existing['is_active']) throw new InvalidArgumentException('This branch is inactive.');
                    $branch = $existing['id'];
                } else {
                    $this->db->prepare('INSERT INTO branches(name,code) VALUES(?,?)')->execute([$name,$code]);
                    $branch = $this->db->lastInsertId();
                }
            }
            $this->db->prepare('INSERT INTO inventory_locations(name,code,type,branch_id) VALUES(?,?,?,?)')->execute([$name,$code,$type,$branch]);
            $id = (int)$this->db->lastInsertId();
            $this->db->prepare("INSERT INTO audit_logs(actor_id,action,entity,entity_id) VALUES(?,'location.create','location',?)")->execute([$owner['id'],$id]);
            $this->db->commit();
            return $id;
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}
