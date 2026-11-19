<?php
declare(strict_types=1);
// Developer fixture for a NEW disposable local DB with Phase 1 SQL already imported.
if (PHP_SAPI!=='cli' || getenv('OPTIMAN_V2_DISPOSABLE')!=='RESET TEST DATABASE') exit(1);
$db=new PDO(getenv('TEST_DB_DSN'),getenv('TEST_DB_USER') ?: 'root',getenv('TEST_DB_PASS'),
    [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
if (!preg_match('/^optiman_v2_test_[a-z0-9_]+$/D',$db->query('SELECT DATABASE()')->fetchColumn())) {
    throw new RuntimeException('Expected dedicated optiman_v2_test_… database.');
}
foreach (['users','products','inventory_locations'] as $table) {
    if ($db->query("SELECT 1 FROM $table LIMIT 1")->fetchColumn()) throw new RuntimeException('Expected empty Phase 1 data.');
}
$email=getenv('OPTIMAN_TEST_EMAIL');
$password=getenv('OPTIMAN_TEST_PASSWORD');
if (!filter_var($email,FILTER_VALIDATE_EMAIL) || strlen($password)<12) throw new RuntimeException('Set synthetic test credentials.');
$db->beginTransaction();
$db->prepare("INSERT INTO users(name,email,password_hash,role) VALUES('Test Owner',?,?,'owner')")->execute([$email,password_hash($password,PASSWORD_DEFAULT)]);
$actor=$db->lastInsertId();
$db->exec("INSERT INTO products(sku,name,color,price,status) VALUES('LEGACY','Legacy model','Brown',1100,'active')");
$product=$db->lastInsertId();
$db->exec("INSERT INTO inventory_locations(name,code,type) VALUES('Original warehouse','ORIG','warehouse')");
$location=$db->lastInsertId();
$db->prepare('INSERT INTO stock_balances(product_id,location_id,on_hand,reserved) VALUES(?,?,8,2)')->execute([$product,$location]);
$db->prepare("INSERT INTO stock_movements(product_id,location_id,quantity,movement_type,actor_id) VALUES(?,?,8,'received',?)")->execute([$product,$location,$actor]);
$db->prepare('INSERT INTO product_images(product_id,basename,is_primary) VALUES(?,?,1)')->execute([$product,bin2hex(random_bytes(16))]);
$db->commit();
echo "Created disposable Phase 1 migration fixture.\n";
