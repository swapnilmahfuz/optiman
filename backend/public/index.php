<?php
declare(strict_types=1);
ini_set('display_errors','0');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
$parent=dirname(__DIR__);
$home=dirname(dirname($parent));
$root=is_dir($home.'/optiman-private/src')?$home.'/optiman-private':(is_dir($parent.'/optiman-private/src')?$parent.'/optiman-private':$parent);
try {
    if (!is_file($root.'/config.php')) throw new RuntimeException('Configuration missing');
    $config=require $root.'/config.php';
    foreach (['Auth','Catalog','ImageService','ImageManager','UserManager'] as $file) require_once $root.'/src/'.$file.'.php';
    $dbconf=$config['db'];
    if (str_contains($config['app_secret'],'REPLACE_') || strlen($config['app_secret'])<32 || str_contains($dbconf['name'],'REPLACE_')) throw new RuntimeException('Configuration incomplete');
    $dsn='mysql:host='.$dbconf['host'].';port='.(int)$dbconf['port'].';dbname='.$dbconf['name'].';charset=utf8mb4';
    $db=new PDO($dsn,$dbconf['user'],$dbconf['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
    $auth=new Optiman\Auth($db,$config['app_secret'],(int)($config['session_idle_seconds']??1800),(bool)($config['session_secure']??true));
    $prefix=rtrim(str_replace('\\','/',dirname($_SERVER['SCRIPT_NAME']??'/index.php')),'/');
    $catalog=new Optiman\Catalog($db,$prefix.'/uploads/products/');
    $path=$_SERVER['PATH_INFO']??($_GET['path']??''); if (!is_string($path)) throw new InvalidArgumentException('Invalid path.');
    if (!$path) { $uri=parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH) ?: ''; $base=$prefix.'/api/v1'; if (str_starts_with($uri,$base)) $path=substr($uri,strlen($prefix)); }
    if (!str_starts_with($path,'/api/v1/')) throw new DomainException('Not found.',404);
    $path=substr($path,7); $method=$_SERVER['REQUEST_METHOD']??'GET';
    $mutating=in_array($method,['POST','PUT','PATCH','DELETE'],true);
    if ($mutating) $auth->requireCsrf($_SERVER['HTTP_X_CSRF_TOKEN']??null);
    $body=[];
    if ($mutating && str_starts_with($_SERVER['CONTENT_TYPE']??'','application/json')) {
        $raw=file_get_contents('php://input',false,null,0,65537); if ($raw===false || strlen($raw)>65536) throw new InvalidArgumentException('Request is too large.');
        try {$body=json_decode($raw,true,32,JSON_THROW_ON_ERROR);} catch (JsonException $e) {throw new InvalidArgumentException('Invalid JSON.');}
        if (!is_array($body)) throw new InvalidArgumentException('Invalid JSON object.');
    }
    $status=200;
    if ($method==='GET' && $path==='/session') $data=['user'=>$auth->user(),'csrf'=>$auth->csrfToken()];
    elseif ($method==='POST' && $path==='/login') {if (!$auth->login((string)($body['email']??''),(string)($body['password']??''),$_SERVER['REMOTE_ADDR']??'')) throw new Optiman\AuthException('Invalid login credentials.',401); $data=['user'=>$auth->requireUser(),'csrf'=>$auth->csrfToken()];}
    elseif ($method==='POST' && $path==='/logout') {$auth->logout();$data=['csrf'=>$auth->csrfToken()];}
    elseif ($method==='GET' && $path==='/products') $data=$catalog->listing($_GET);
    elseif ($method==='GET' && preg_match('~^/products/(\d+)$~',$path,$m)) $data=$catalog->detail((int)$m[1]);
    elseif ($method==='GET' && in_array($path,['/categories','/audiences'],true)) {$all=$catalog->taxonomies();$data=$all[substr($path,1)];}
    elseif ($method==='GET' && in_array($path,['/admin/categories','/admin/audiences'],true)) {$auth->requireOwner();$all=$catalog->taxonomies(true);$data=$all[substr($path,7)];}
    elseif ($method==='GET' && $path==='/admin/products') {$auth->requireOwner();$data=$catalog->listing($_GET,true);}
    elseif ($method==='POST' && $path==='/admin/products') {$data=$catalog->save($body,$auth->requireOwner());$status=201;}
    elseif (preg_match('~^/admin/products/(\d+)$~',$path,$m) && $method==='GET') {$auth->requireOwner();$data=$catalog->detail((int)$m[1],true);}
    elseif (preg_match('~^/admin/products/(\d+)$~',$path,$m) && $method==='PUT') $data=$catalog->save($body,$auth->requireOwner(),(int)$m[1]);
    elseif ($method==='POST' && $path==='/admin/categories') {$data=$catalog->saveCategory($body,$auth->requireOwner());$status=201;}
    elseif ($method==='PUT' && preg_match('~^/admin/categories/(\d+)$~',$path,$m)) $data=$catalog->saveCategory($body,$auth->requireOwner(),(int)$m[1]);
    elseif ($method==='GET' && $path==='/admin/locations') $data=$catalog->locations($auth->requireUser());
    elseif ($method==='GET' && $path==='/admin/inventory') $data=$catalog->inventory($auth->requireUser(),$_GET);
    elseif (preg_match('~^/admin/products/(\d+)/images(?:/(\d+)(?:/(primary))?)?$~',$path,$m) && in_array($method,['GET','POST','PUT','DELETE'],true)) {
        $actor=$auth->requireOwner(); $productId=(int)$m[1];
        $images=new Optiman\ImageManager($db,new Optiman\ImageService($config['upload_path'],(int)($config['upload_max_bytes']??1800000)),(int)($config['upload_max_images']??5));
        if ($method==='GET' && empty($m[2])) $data=$images->list($actor,$productId);
        elseif ($method==='POST' && empty($m[2])) {if (empty($_FILES['image']) && (int)($_SERVER['CONTENT_LENGTH']??0)>0) throw new InvalidArgumentException('Upload exceeds the server limit or no image was supplied.');$data=$images->upload($actor,$productId,$_FILES['image']??[]);$status=201;}
        elseif ($method==='PUT' && !empty($m[2]) && !empty($m[3])) {$images->setPrimary($actor,$productId,(int)$m[2]);$data=['ok'=>true];}
        elseif ($method==='DELETE' && !empty($m[2]) && empty($m[3])) {$images->delete($actor,$productId,(int)$m[2]);$data=['ok'=>true];}
        else throw new DomainException('Not found.',404);
    }
    elseif ($method==='PUT' && preg_match('~^/admin/products/(\d+)/images/order$~',$path,$m)) {$actor=$auth->requireOwner();$images=new Optiman\ImageManager($db,new Optiman\ImageService($config['upload_path'],(int)($config['upload_max_bytes']??1800000)),(int)($config['upload_max_images']??5));$images->reorder($actor,(int)$m[1],$body['image_ids']??[]);$data=['ok'=>true];}
    elseif ($path==='/admin/users' && $method==='GET') {$manager=new Optiman\UserManager($db,$auth);$data=$manager->list((int)($_GET['page']??1),(int)($_GET['per_page']??25));}
    elseif ($path==='/admin/users' && $method==='POST') {$manager=new Optiman\UserManager($db,$auth);$data=['id'=>$manager->create($body)];$status=201;}
    elseif ($method==='PUT' && preg_match('~^/admin/users/(\d+)$~',$path,$m)) {$manager=new Optiman\UserManager($db,$auth);$manager->update((int)$m[1],$body);$data=['ok'=>true];}
    else throw new DomainException('Not found.',404);
    http_response_code($status); echo json_encode(['data'=>$data],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
} catch (Optiman\AuthException $e) {http_response_code($e->status);echo json_encode(['error'=>['message'=>$e->getMessage()]]);}
catch (InvalidArgumentException $e) {http_response_code(422);echo json_encode(['error'=>['message'=>$e->getMessage()]]);}
catch (DomainException $e) {http_response_code(in_array($e->getCode(),[403,404,409],true)?$e->getCode():400);echo json_encode(['error'=>['message'=>$e->getMessage()]]);}
catch (Throwable $e) {error_log('Optiman backend: '.get_class($e).' '.$e->getMessage());$duplicate=$e instanceof PDOException && $e->getCode()==='23000';http_response_code($duplicate?409:500);echo json_encode(['error'=>['message'=>$duplicate?'Conflicting or invalid record.':'Service unavailable.']]);}
