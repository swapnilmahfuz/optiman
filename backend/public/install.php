<?php
declare(strict_types=1);
ini_set('display_errors','0');
header('Cache-Control: no-store'); header('X-Content-Type-Options: nosniff'); header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
$root=dirname(dirname(__DIR__)).'/optiman-private';
if (($_SERVER['HTTPS']??'') !== 'on' && ($_SERVER['HTTPS']??'') !== '1') { http_response_code(403); exit('HTTPS is required.'); }
if (is_file($root.'/config.php') || is_file($root.'/installation.lock')) { http_response_code(404); exit('Installer unavailable.'); }
session_name('optiman_setup'); session_set_cookie_params(['secure'=>true,'httponly'=>true,'samesite'=>'Strict','path'=>'/optiman-backend/']); session_start();
$_SESSION['csrf'] ??= bin2hex(random_bytes(32));
$message=''; $authorized=false;
$required=['pdo_mysql','gd','fileinfo','mbstring','openssl']; $missing=array_filter($required,fn($e)=>!extension_loaded($e));
$ready=PHP_VERSION_ID>=80200 && !$missing && function_exists('imagewebp') && is_writable($root) && is_writable(__DIR__.'/uploads/products');
if ($_SERVER['REQUEST_METHOD']==='POST') {
 try {
  if (!hash_equals($_SESSION['csrf'],(string)($_POST['csrf']??''))) throw new RuntimeException();
  $file=$root.'/setup.token'; if (!is_file($file) || is_link($file)) throw new RuntimeException();
  $limit=fopen($root.'/setup.attempts','c+'); if (!$limit || !flock($limit,LOCK_EX)) throw new RuntimeException();
  $state=json_decode(stream_get_contents($limit),true) ?: ['start'=>time(),'count'=>0]; if (time()-$state['start']>900) $state=['start'=>time(),'count'=>0];
  $state['count']++; rewind($limit); ftruncate($limit,0); fwrite($limit,json_encode($state)); fflush($limit); flock($limit,LOCK_UN); fclose($limit);
  if ($state['count']>8) throw new RuntimeException();
  if (!chmod($file,0600) || (fileperms($file) & 0077)!==0) throw new RuntimeException();
  $token=trim((string)file_get_contents($file)); $given=(string)($_POST['token']??'');
  if (!preg_match('/^[a-f0-9]{64}$/D',$token) || !hash_equals($token,$given)) throw new RuntimeException();
  $authorized=true;
  if (isset($_POST['install'])) {
   if (!$ready) throw new RuntimeException();
   $dbhost=trim((string)($_POST['host']??'')); $dbname=trim((string)($_POST['database']??'')); $dbuser=trim((string)($_POST['dbuser']??'')); $dbpass=(string)($_POST['dbpass']??'');
   $name=trim((string)($_POST['name']??'')); $email=mb_strtolower(trim((string)($_POST['email']??'')),'UTF-8'); $password=(string)($_POST['password']??'');
   if (!preg_match('/^[a-zA-Z0-9_.-]{1,150}$/D',$dbhost) || !preg_match('/^[a-zA-Z0-9_]{1,64}$/D',$dbname) || !preg_match('/^[a-zA-Z0-9_]{1,80}$/D',$dbuser) || strlen($dbpass)>1024 || $name==='' || mb_strlen($name)>120 || !filter_var($email,FILTER_VALIDATE_EMAIL) || strlen($email)>254 || strlen($password)<12 || strlen($password)>72 || !hash_equals($password,(string)($_POST['confirm']??''))) throw new RuntimeException();
   $mutex=fopen($root.'/setup.mutex','c+'); if (!$mutex || !flock($mutex,LOCK_EX)) throw new RuntimeException();
   try {
    if (is_file($root.'/config.php') || is_file($root.'/installation.lock') || !is_file($file) || !hash_equals(trim((string)file_get_contents($file)),$given)) throw new RuntimeException();
    $db=new PDO('mysql:host='.$dbhost.';dbname='.$dbname.';charset=utf8mb4',$dbuser,$dbpass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
    if ($db->query('SHOW FULL TABLES')->fetch() !== false) throw new RuntimeException();
    // A permanent failure marker prevents retry into a partially migrated database.
    $marker=fopen($root.'/installation.lock','x'); if (!$marker) throw new RuntimeException(); chmod($root.'/installation.lock',0600); fwrite($marker,"Installation started.\n"); fclose($marker);
    $sql=file_get_contents($root.'/migrations/001_foundation.sql'); if ($sql===false) throw new RuntimeException();
    $sql=preg_replace('/^\s*--.*$/m','',$sql); foreach (explode(';',$sql) as $statement) {if (trim($statement)!=='') $db->exec($statement);}
    $stmt=$db->prepare("INSERT INTO users(name,email,password_hash,role,branch_id,is_active) VALUES (?,?,?,'owner',NULL,1)"); $stmt->execute([$name,$email,password_hash($password,PASSWORD_DEFAULT)]);
    if ((int)$db->query("SELECT COUNT(*) FROM users WHERE role='owner' AND is_active=1")->fetchColumn()!==1 || !$db->query("SELECT version FROM schema_migrations WHERE version='001_foundation'")->fetchColumn()) throw new RuntimeException();
    $config=['db'=>['host'=>$dbhost,'port'=>3306,'name'=>$dbname,'user'=>$dbuser,'password'=>$dbpass,'charset'=>'utf8mb4'],'app_secret'=>bin2hex(random_bytes(32)),'session_secure'=>true,'session_idle_seconds'=>1800,'upload_path'=>__DIR__.'/uploads/products','upload_max_bytes'=>1800000,'upload_max_images'=>5];
    $out=fopen($root.'/config.php','x'); if (!$out) throw new RuntimeException(); chmod($root.'/config.php',0600); $content="<?php\ndeclare(strict_types=1);\nreturn ".var_export($config,true).";\n"; if (fwrite($out,$content)!==strlen($content) || !fflush($out)) {fclose($out);unlink($root.'/config.php');throw new RuntimeException();} fclose($out);
    @unlink($file); session_destroy(); header('Location: admin/',true,303); exit;
   } finally {flock($mutex,LOCK_UN);fclose($mutex);}
  }
 } catch (Throwable $e) {http_response_code(400);$message='Setup could not be completed. Check the token, requirements and fresh database. If installation began, see the recovery instructions.';}
}
function h(string $s): string {return htmlspecialchars($s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
?><!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Optiman setup</title><style>body{font:16px system-ui;background:#f7f1e7;color:#2b1d17;max-width:38rem;margin:3rem auto;padding:0 1rem}label{display:block;margin:1rem 0}input{display:block;width:100%;padding:.7rem;box-sizing:border-box}button{padding:.8rem;background:#2b1d17;color:#fff;border:0;border-radius:.4rem}small{display:block}</style><h1>Optiman setup</h1><p>Requirements: <?= $ready?'Ready':'Not ready: check PHP 8.2, PDO MySQL, GD WebP, fileinfo, mbstring, OpenSSL and writable private/upload directories.' ?></p><p role="alert"><?=h($message)?></p><form method="post" autocomplete="off"><input type="hidden" name="csrf" value="<?=h($_SESSION['csrf'])?>"><label>Private installation token<input name="token" type="password" required minlength="64" maxlength="64"></label><?php if ($authorized): ?><label>Database host<input name="host" value="localhost" required></label><label>Database name<input name="database" required></label><label>Database user<input name="dbuser" required></label><label>Database password<input name="dbpass" type="password"></label><label>Owner name<input name="name" required></label><label>Owner email<input name="email" type="email" required></label><label>Owner password<input name="password" type="password" minlength="12" required></label><label>Confirm Owner password<input name="confirm" type="password" minlength="12" required></label><button name="install" value="1">Install</button><?php else: ?><button>Continue</button><?php endif ?></form></html>
