<?php
declare(strict_types=1);
namespace Optiman;

use PDO;
use InvalidArgumentException;
use DomainException;
use Throwable;

/** Catalog reads and master-catalog writes; no inventory mutations. */
require_once __DIR__.'/Variants.php';
require_once __DIR__.'/ImageService.php';

final class Catalog
{
    public function __construct(private PDO $db, private string $imageBase = 'uploads/products/') {}

    private function owner(array $actor): void
    {
        if (($actor['role'] ?? null) !== 'owner' || empty($actor['id'])) {
            throw new DomainException('Forbidden', 403);
        }
    }
    private function page(array $query): array
    {
        $page = filter_var($query['page'] ?? 1, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1,'max_range'=>100000]]);
        $per = filter_var($query['per_page'] ?? 20, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1,'max_range'=>100]]);
        if ($page === false || $per === false) throw new InvalidArgumentException('Invalid pagination.');
        return [$page, $per];
    }
    private function text(mixed $value, int $max, bool $required = false): string
    {
        if (!is_string($value)) throw new InvalidArgumentException('Invalid text field.');
        $value = trim($value);
        if (($required && $value === '') || mb_strlen($value, 'UTF-8') > $max) throw new InvalidArgumentException('Invalid text length.');
        return $value;
    }
    private function ids(mixed $value): array
    {
        if (!is_array($value) || count($value) > 100) throw new InvalidArgumentException('Invalid selection.');
        $result = [];
        foreach ($value as $id) {
            $id = filter_var($id, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1]]);
            if ($id === false) throw new InvalidArgumentException('Invalid selection.');
            $result[] = $id;
        }
        return array_values(array_unique($result));
    }
    private function associations(array &$products, bool $admin): void
    {
        if (!$products) return;
        $ids = array_column($products, 'id');
        $marks = implode(',', array_fill(0,count($ids),'?'));
        $byId = [];
        foreach ($products as $i => &$row) { $row['categories']=[]; $row['audiences']=[]; $row['images']=[]; $byId[(string)$row['id']]=$i; }
        unset($row);
        foreach (['categories'=>'product_categories','audiences'=>'product_audiences'] as $table=>$join) {
            $foreign = $table === 'categories' ? 'category_id' : 'audience_id';
            $extra = $table === 'categories' ? ', t.is_active' : '';
            $active = $table === 'categories' && !$admin ? ' AND t.is_active=1' : '';
            $s=$this->db->prepare("SELECT j.product_id,t.id,t.name,t.slug$extra FROM $join j JOIN $table t ON t.id=j.$foreign WHERE j.product_id IN ($marks)$active ORDER BY t.name,t.id");
            $s->execute($ids);
            foreach($s->fetchAll(PDO::FETCH_ASSOC) as $row) { $index=$byId[(string)$row['product_id']]; unset($row['product_id']); $products[$index][$table][]=$row; }
        }
        $visible = $admin ? '' : " AND v.status='active'";
        $q = $this->db->prepare("SELECT v.id,v.product_id,v.sku,v.color_name,v.color_hex,v.price,v.tryon_asset,v.status,v.is_default,
            COALESCE((SELECT SUM(b.on_hand-b.reserved) FROM stock_balances b
                JOIN inventory_locations l ON l.id=b.location_id AND l.is_active=1
                LEFT JOIN branches br ON br.id=l.branch_id
                WHERE b.variant_id=v.id AND (l.branch_id IS NULL OR br.is_active=1)),0) AS available
            FROM product_variants v WHERE v.product_id IN ($marks)$visible ORDER BY v.is_default DESC,v.id");
        $q->execute($ids);
        $variants = [];
        foreach ($products as &$product) { $product['variants']=[]; $product['default_variant_id']=null; $product['available']=0; }
        unset($product);
        foreach ($q as $variant) {
            $variant['images'] = [];
            $variant['available'] = (int)$variant['available'];
            $variants[$variant['id']] = $variant;
        }
        $q = $this->db->prepare("SELECT id,variant_id,basename,is_primary,sort_order FROM product_images WHERE product_id IN ($marks) ORDER BY sort_order,id");
        $q->execute($ids);
        foreach ($q as $image) {
            if (!isset($variants[$image['variant_id']]) || !preg_match('/^[a-f0-9]{32}$/D',$image['basename'])) continue;
            $image['urls']=ImageService::urls($this->imageBase,$image['basename']);
            $variants[$image['variant_id']]['images'][]=$image;
        }
        foreach ($variants as $variant) {
            $i = $byId[$variant['product_id']];
            $products[$i]['variants'][] = $variant;
            if ($variant['status']==='active') $products[$i]['available'] += $variant['available'];
            if ($variant['is_default']) {
                $products[$i]['default_variant_id'] = $variant['id'];
                $products[$i]['images'] = $variant['images'];
            }
        }
    }
    public function listing(array $query, bool $admin = false): array
    {
        [$page,$per]=$this->page($query); $where=[]; $args=[];
        if (!$admin) $where[]="p.status='active'";
        $search=$this->text($query['search'] ?? '', 160);
        if ($search!=='') { $where[]="(p.name LIKE ? ESCAPE '=' OR p.sku LIKE ? ESCAPE '=' OR EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.sku LIKE ? ESCAPE '='".($admin?'':" AND v.status='active'")."))"; $term='%'.str_replace(['=','%','_'],['==','=%','=_'],$search).'%'; array_push($args,$term,$term,$term); }
        foreach(['category'=>'product_categories','audience'=>'product_audiences'] as $key=>$join) {
            if (!isset($query[$key]) || $query[$key]==='') continue;
            $id=filter_var($query[$key],FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]); if ($id===false) throw new InvalidArgumentException('Invalid filter.');
            $field=$key.'_id';
            $visibleCategory=$key==='category' && !$admin ? ' JOIN categories c ON c.id=filter.category_id AND c.is_active=1' : '';
            $where[]="EXISTS (SELECT 1 FROM $join filter$visibleCategory WHERE filter.product_id=p.id AND filter.$field=?)"; $args[]=$id;
        }
        if ($admin && isset($query['status']) && $query['status']!=='') { if (!in_array($query['status'],['active','inactive','draft'],true)) throw new InvalidArgumentException('Invalid status.'); $where[]='p.status=?'; $args[]=$query['status']; }
        $condition=$where?' WHERE '.implode(' AND ',$where):'';
        $count=$this->db->prepare('SELECT COUNT(*) FROM products p'.$condition); $count->execute($args); $total=(int)$count->fetchColumn();
        $s=$this->db->prepare('SELECT p.id,p.sku,p.name,p.description,p.frame_style,p.material,p.color,p.price,p.status,p.tryon_asset,p.created_at,p.updated_at FROM products p'.$condition.' ORDER BY p.id DESC LIMIT ? OFFSET ?');
        foreach($args as $i=>$arg) $s->bindValue($i+1,$arg,is_int($arg)?PDO::PARAM_INT:PDO::PARAM_STR);
        $s->bindValue(count($args)+1,$per,PDO::PARAM_INT); $s->bindValue(count($args)+2,($page-1)*$per,PDO::PARAM_INT); $s->execute();
        $items=$s->fetchAll(PDO::FETCH_ASSOC); $this->associations($items,$admin);
        return ['items'=>$items,'page'=>$page,'per_page'=>$per,'total'=>$total];
    }
    public function detail(int $id, bool $admin = false): array
    {
        if ($id<1) throw new InvalidArgumentException('Invalid product.');
        $s=$this->db->prepare('SELECT id,sku,name,description,frame_style,material,color,price,status,tryon_asset,created_at,updated_at FROM products WHERE id=?'.($admin?'':" AND status='active'")); $s->execute([$id]); $p=$s->fetch(PDO::FETCH_ASSOC);
        if (!$p) throw new DomainException('Product not found.',404);
        $rows=[$p]; $this->associations($rows,$admin); return $rows[0];
    }
    public function taxonomies(bool $admin = false): array
    {
        $categories=$this->db->query('SELECT id,name,slug,is_active FROM categories'.($admin?'':' WHERE is_active=1').' ORDER BY name,id')->fetchAll(PDO::FETCH_ASSOC);
        $audiences=$this->db->query('SELECT id,name,slug FROM audiences ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
        return compact('categories','audiences');
    }
    public function save(array $data,array $actor,?int $id=null): array
    {
        $this->owner($actor); $creating = $id === null; if ($id!==null && $id<1) throw new InvalidArgumentException('Invalid product.');
        $variant = $data['default_variant'] ?? null;
        if ($variant !== null && (!is_array($variant) || !$creating)) throw new InvalidArgumentException('Edit existing colors through the variant controls.');
        $fields=[];
        foreach(['sku'=>80,'name'=>160,'description'=>10000,'frame_style'=>100,'material'=>100,'color'=>100] as $key=>$limit) $fields[$key]=$this->text($data[$key]??'', $limit, in_array($key,['sku','name'],true));
        if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/D',$fields['sku'])) throw new InvalidArgumentException('Invalid SKU.');
        $price=$variant['price']??$data['price']??($creating ? null : 0); if (!is_string($price) && !is_int($price) && !is_float($price)) throw new InvalidArgumentException('Invalid price.'); $price=(string)$price;
        if (!preg_match('/^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?$/D',$price)) throw new InvalidArgumentException('Invalid price.'); $fields['price']=$price;
        $status=$data['status']??'inactive'; if (!in_array($status,['active','inactive','draft'],true)) throw new InvalidArgumentException('Invalid status.'); $fields['status']=$status;
        $tryon=$this->text($data['tryon_asset']??'',255); if ($tryon!=='' && (!preg_match('~^[A-Za-z0-9][A-Za-z0-9_./-]*$~D',$tryon) || str_contains($tryon,'..'))) throw new InvalidArgumentException('Invalid try-on reference.'); $fields['tryon_asset']=$tryon?:null;
        $categories=$this->ids($data['category_ids']??[]); $audiences=$this->ids($data['audience_ids']??[]);
        $this->db->beginTransaction();
        try {
            foreach(['categories'=>$categories,'audiences'=>$audiences] as $table=>$values) { if (!$values) continue; $marks=implode(',',array_fill(0,count($values),'?')); $s=$this->db->prepare("SELECT COUNT(*) FROM $table WHERE id IN ($marks)"); $s->execute($values); if ((int)$s->fetchColumn()!==count($values)) throw new InvalidArgumentException('Unknown category or audience.'); }
            if ($id===null) { $s=$this->db->prepare('INSERT INTO products (sku,name,description,frame_style,material,color,price,status,tryon_asset) VALUES (?,?,?,?,?,?,?,?,?)'); $s->execute(array_values($fields)); $id=(int)$this->db->lastInsertId(); }
            else { $s=$this->db->prepare('SELECT id FROM products WHERE id=? FOR UPDATE'); $s->execute([$id]); if (!$s->fetchColumn()) throw new DomainException('Product not found.',404); $s=$this->db->prepare('UPDATE products SET sku=?,name=?,description=?,frame_style=?,material=?,color=?,price=?,status=?,tryon_asset=? WHERE id=?'); $s->execute([...array_values($fields),$id]); }
            $variants = new Variants($this->db);
            if ($creating) {
                $variants->write($id,$variant ?? ['sku'=>$fields['sku'],'color_name'=>$fields['color'] ?: 'Original','price'=>$price,
                    'tryon_asset'=>$tryon,'status'=>'active'],null,true);
            } else {
                $q=$this->db->prepare('SELECT * FROM product_variants WHERE product_id=? AND is_default=1 FOR UPDATE');
                $q->execute([$id]); $default=$q->fetch(PDO::FETCH_ASSOC);
                if (!$default) throw new DomainException('Default variant missing.',409);
                if (isset($data['color'])) $default['color_name']=$fields['color'] ?: 'Original';
                if (isset($data['price'])) $default['price']=$price;
                if (array_key_exists('tryon_asset',$data)) $default['tryon_asset']=$tryon;
                $variants->write($id,$default,(int)$default['id']);
            }
            foreach(['product_categories'=>['category_id',$categories],'product_audiences'=>['audience_id',$audiences]] as $join=>[$field,$values]) { $s=$this->db->prepare("DELETE FROM $join WHERE product_id=?"); $s->execute([$id]); $s=$this->db->prepare("INSERT INTO $join (product_id,$field) VALUES (?,?)"); foreach($values as $value) $s->execute([$id,$value]); }
            $s=$this->db->prepare('INSERT INTO audit_logs (actor_id,action,entity,entity_id,metadata) VALUES (?, ?, ?, ?, ?)'); $s->execute([(int)$actor['id'],$creating ? 'product.create' : 'product.update','product',$id,'{}']);
            $this->db->commit(); return $this->detail($id,true);
        } catch (Throwable $e) { if ($this->db->inTransaction()) $this->db->rollBack(); throw $e; }
    }
    public function saveCategory(array $data,array $actor,?int $id=null): array
    {
        $this->owner($actor); $name=$this->text($data['name']??'',100,true); $slug=$this->text($data['slug']??'',100,true); if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D',$slug)) throw new InvalidArgumentException('Invalid category slug.');
        $active=$data['is_active']??true; if (!in_array($active,[true,false,0,1,'0','1'],true)) throw new InvalidArgumentException('Invalid category status.');
        $this->db->beginTransaction(); try { if ($id===null) { $s=$this->db->prepare('INSERT INTO categories (name,slug,is_active) VALUES (?,?,?)'); $s->execute([$name,$slug,(int)$active]); $id=(int)$this->db->lastInsertId(); } else { if ($id<1) throw new InvalidArgumentException('Invalid category.'); $s=$this->db->prepare('SELECT id FROM categories WHERE id=? FOR UPDATE'); $s->execute([$id]); if (!$s->fetchColumn()) throw new DomainException('Category not found.',404); $s=$this->db->prepare('UPDATE categories SET name=?,slug=?,is_active=? WHERE id=?'); $s->execute([$name,$slug,(int)$active,$id]); } $s=$this->db->prepare('INSERT INTO audit_logs (actor_id,action,entity,entity_id,metadata) VALUES (?, ?, ?, ?, ?)'); $s->execute([(int)$actor['id'],'category.save','category',$id,'{}']); $this->db->commit(); return ['id'=>$id,'name'=>$name,'slug'=>$slug,'is_active'=>(int)$active]; } catch (Throwable $e) { if ($this->db->inTransaction()) $this->db->rollBack(); throw $e; }
    }
    public function locations(array $actor): array
    {
        if (empty($actor['id']) || !in_array($actor['role']??'', ['owner','branch_manager'],true)) throw new DomainException('Forbidden',403);
        $owner=$actor['role']==='owner'; if (!$owner && empty($actor['branch_id'])) throw new DomainException('Forbidden',403);
        $s=$this->db->prepare('SELECT id,name,code,type,branch_id,is_active FROM inventory_locations'.($owner?'':' WHERE type=\'branch\' AND branch_id=?').' ORDER BY name,id'); $s->execute($owner?[]:[(int)$actor['branch_id']]); return $s->fetchAll(PDO::FETCH_ASSOC);
    }
    public function inventory(array $actor,array $query): array
    {
        [$page,$per]=$this->page($query); $allowed=$this->locations($actor); $ids=array_column($allowed,'id'); if (!$ids) return ['items'=>[],'page'=>$page,'per_page'=>$per,'total'=>0];
        if (isset($query['location_id']) && $query['location_id']!=='') { $requested=filter_var($query['location_id'],FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]); if ($requested===false || !in_array((string)$requested,array_map('strval',$ids),true)) throw new DomainException('Forbidden',403); $ids=[$requested]; }
        $marks=implode(',',array_fill(0,count($ids),'?')); $where=" WHERE b.location_id IN ($marks)";
        if (isset($query['variant_id'])) { $where.=' AND b.variant_id=?'; $ids[]=(int)$query['variant_id']; }
        $count=$this->db->prepare('SELECT COUNT(*) FROM stock_balances b'.$where); $count->execute($ids); $total=(int)$count->fetchColumn();
        $s=$this->db->prepare('SELECT b.product_id,b.variant_id,b.location_id,b.on_hand,b.reserved,b.updated_at,v.sku,v.color_name,p.sku AS parent_sku,p.name FROM stock_balances b JOIN products p ON p.id=b.product_id JOIN product_variants v ON v.id=b.variant_id'.$where.' ORDER BY b.product_id,b.variant_id,b.location_id LIMIT ? OFFSET ?'); foreach($ids as $i=>$id)$s->bindValue($i+1,(int)$id,PDO::PARAM_INT); $s->bindValue(count($ids)+1,$per,PDO::PARAM_INT); $s->bindValue(count($ids)+2,($page-1)*$per,PDO::PARAM_INT); $s->execute(); return ['items'=>$s->fetchAll(PDO::FETCH_ASSOC),'page'=>$page,'per_page'=>$per,'total'=>$total];
    }
}
