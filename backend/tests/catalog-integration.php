<?php
declare(strict_types=1);
// Disposable MariaDB only: creates unique synthetic fixtures and removes them afterwards.
require_once __DIR__ . '/../src/Catalog.php';
use Optiman\Catalog;
function checkCatalog(bool $value,string $message): void {if (!$value) throw new RuntimeException($message);}
function catalogDenied(callable $fn,int $code): void {try {$fn();} catch (DomainException $e) {checkCatalog($e->getCode()===$code,'Incorrect denial status');return;} throw new RuntimeException('Expected denial');}
$db=new PDO(getenv('TEST_DB_DSN') ?: 'mysql:host=127.0.0.1;dbname=optiman_test;charset=utf8mb4',getenv('TEST_DB_USER') ?: 'root',getenv('TEST_DB_PASS') ?: '',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$token=bin2hex(random_bytes(6));$ids=[];
try {
 $stmt=$db->prepare('INSERT INTO branches(name,code) VALUES (?,?)');foreach(['a','b'] as $key){$stmt->execute(['Test '.$key,$key.$token]);$ids[$key]=(int)$db->lastInsertId();}
 $stmt=$db->prepare('INSERT INTO inventory_locations(name,code,type,branch_id) VALUES (?,?,?,?)');foreach(['a','b','w'] as $key){$stmt->execute(['Test '.$key,'l'.$key.$token,$key==='w'?'warehouse':'branch',$key==='w'?null:$ids[$key]]);$ids['l'.$key]=(int)$db->lastInsertId();}
 $stmt=$db->prepare('INSERT INTO users(name,email,password_hash,role,branch_id) VALUES (?,?,?,?,?)');$stmt->execute(['Owner','owner'.$token.'@example.test',password_hash('synthetic',PASSWORD_DEFAULT),'owner',null]);$ids['owner']=(int)$db->lastInsertId();$stmt->execute(['Manager','manager'.$token.'@example.test',password_hash('synthetic',PASSWORD_DEFAULT),'branch_manager',$ids['a']]);$ids['manager']=(int)$db->lastInsertId();
 $owner=['id'=>$ids['owner'],'role'=>'owner','branch_id'=>null];$manager=['id'=>$ids['manager'],'role'=>'branch_manager','branch_id'=>$ids['a']];$catalog=new Catalog($db,'/demo/uploads/products/');
 $category=$catalog->saveCategory(['name'=>'Test '.$token,'slug'=>'test-'.$token,'is_active'=>true],$owner);$ids['category']=$category['id'];
 $all=$catalog->taxonomies();$aud=(int)$all['audiences'][0]['id'];$input=['sku'=>'TEST-'.$token,'name'=>'Frame '.$token,'description'=>'Synthetic','frame_style'=>'Round','material'=>'Acetate','color'=>'Amber','price'=>'1200.50','status'=>'active','tryon_asset'=>'frames/example.webp','category_ids'=>[$ids['category']],'audience_ids'=>[$aud]];
 catalogDenied(fn()=>$catalog->save($input,$manager),403);$p=$catalog->save($input,$owner);$ids['product']=(int)$p['id'];checkCatalog($p['sku']===$input['sku']&&count($p['categories'])===1&&count($p['audiences'])===1,'Product creation/associations');
 $input['name']='Edited '.$token;$input['price']='1400.00';$p=$catalog->save($input,$owner,$ids['product']);checkCatalog($p['name']===$input['name']&&$p['price']==='1400.00','Product update');
 try {$catalog->save($input,$owner);throw new RuntimeException('Duplicate SKU accepted');} catch (PDOException $e) {checkCatalog($e->getCode()==='23000','Duplicate SKU SQL state');}
 $items=$catalog->listing(['search'=>$input['sku'],'category'=>$ids['category'],'audience'=>$aud]);checkCatalog($items['total']===1&&(int)$items['items'][0]['id']===$ids['product'],'Filtered public listing');
 $imageInsert=$db->prepare('INSERT INTO product_images(product_id,variant_id,basename,is_primary,sort_order) VALUES (?,?,?,?,?)');$imageInsert->execute([$ids['product'],$p['default_variant_id'],str_repeat('a',32),0,0]);$imageInsert->execute([$ids['product'],$p['default_variant_id'],str_repeat('b',32),1,1]);$p=$catalog->detail($ids['product']);checkCatalog(str_ends_with($p['images'][0]['urls']['main'],'-1000.webp'),'Image URLs');checkCatalog($p['images'][0]['basename']===str_repeat('a',32)&&(int)$p['images'][0]['is_primary']===0&&$p['images'][1]['basename']===str_repeat('b',32)&&(int)$p['images'][1]['is_primary']===1,'Explicit image ordering and primary flag');
 $input['status']='inactive';$catalog->save($input,$owner,$ids['product']);catalogDenied(fn()=>$catalog->detail($ids['product']),404);checkCatalog($catalog->listing(['search'=>$input['sku']])['total']===0,'Inactive excluded');checkCatalog($catalog->listing(['search'=>$input['sku']],true)['total']===1,'Inactive admin visible');
 $stmt=$db->prepare('INSERT INTO stock_balances(product_id,variant_id,location_id,on_hand,reserved) VALUES (?,?,?,?,?)');foreach(['la','lb','lw'] as $loc)$stmt->execute([$ids['product'],$p['default_variant_id'],$ids[$loc],5,1]);
 $locations=$catalog->locations($manager);checkCatalog(count($locations)===1&&(int)$locations[0]['id']===$ids['la'],'Manager location scope');$inventory=$catalog->inventory($manager,[]);checkCatalog($inventory['total']===1&&(int)$inventory['items'][0]['location_id']===$ids['la'],'Manager inventory scope');catalogDenied(fn()=>$catalog->inventory($manager,['location_id'=>$ids['lb']]),403);catalogDenied(fn()=>$catalog->inventory($manager,['location_id'=>$ids['lw']]),403);
 echo "Catalog integration passed: CRUD, duplicates, categories/audiences, public visibility, images and branch isolation.\n";
} finally {
 if(isset($ids['owner'],$ids['manager']))$db->prepare('DELETE FROM audit_logs WHERE actor_id IN (?,?)')->execute([$ids['owner'],$ids['manager']]);
 if(isset($ids['product'])) {$db->prepare('DELETE FROM stock_balances WHERE product_id=?')->execute([$ids['product']]);$db->prepare('DELETE FROM product_images WHERE product_id=?')->execute([$ids['product']]);$db->prepare('DELETE FROM product_variants WHERE product_id=?')->execute([$ids['product']]);$db->prepare('DELETE FROM products WHERE id=?')->execute([$ids['product']]);}
 if(isset($ids['category']))$db->prepare('DELETE FROM categories WHERE id=?')->execute([$ids['category']]);
 if(isset($ids['owner'],$ids['manager']))$db->prepare('DELETE FROM users WHERE id IN (?,?)')->execute([$ids['owner'],$ids['manager']]);
 foreach(['la','lb','lw'] as $key)if(isset($ids[$key]))$db->prepare('DELETE FROM inventory_locations WHERE id=?')->execute([$ids[$key]]);
 foreach(['a','b'] as $key)if(isset($ids[$key]))$db->prepare('DELETE FROM branches WHERE id=?')->execute([$ids[$key]]);
}
