<?php
declare(strict_types=1);
// Run only against an isolated, disposable MariaDB database with migration 001 applied.
require_once __DIR__ . '/../src/Auth.php';
require_once __DIR__ . '/../src/UserManager.php';
use Optiman\Auth;
use Optiman\AuthException;
use Optiman\RateLimitException;

function check(bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); }
function denied(callable $f, int $code, string $message): void {
    try { $f(); } catch (AuthException $e) { check($e->status === $code, $message . ': wrong status'); return; }
    throw new RuntimeException($message . ': unexpectedly permitted');
}
$db = new PDO(getenv('TEST_DB_DSN') ?: 'mysql:host=127.0.0.1;dbname=optiman_test;charset=utf8mb4', getenv('TEST_DB_USER') ?: 'root', getenv('TEST_DB_PASS') ?: '', [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES=>false, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$token = bin2hex(random_bytes(6));
$ipBase = '10.'.random_int(1,254).'.'.random_int(1,254).'.';
$ids=[];
try {
    $branch=$db->prepare('INSERT INTO branches (name,code) VALUES (?,?)');
    $branch->execute(['Test A','a-'.$token]); $ids['a']=(int)$db->lastInsertId();
    $branch->execute(['Test B','b-'.$token]); $ids['b']=(int)$db->lastInsertId();
    $location=$db->prepare('INSERT INTO inventory_locations (name,code,type,branch_id) VALUES (?,?,?,?)');
    $location->execute(['Test A','la-'.$token,'branch',$ids['a']]); $ids['la']=(int)$db->lastInsertId();
    $location->execute(['Test B','lb-'.$token,'branch',$ids['b']]); $ids['lb']=(int)$db->lastInsertId();
    $location->execute(['Test warehouse','wh-'.$token,'warehouse',null]); $ids['wh']=(int)$db->lastInsertId();
    $user=$db->prepare('INSERT INTO users (name,email,password_hash,role,branch_id,is_active) VALUES (?,?,?,?,?,1)');
    $hash=password_hash('only-for-isolated-test', PASSWORD_DEFAULT);
    $owner='owner-'.$token.'@example.test'; $manager='manager-'.$token.'@example.test';
    $user->execute(['Test owner',$owner,$hash,'owner',null]); $ids['owner']=(int)$db->lastInsertId();
    $user->execute(['Test manager',$manager,$hash,'branch_manager',$ids['a']]); $ids['manager']=(int)$db->lastInsertId();
    $auth=new Auth($db, str_repeat('test-secret-', 4), 60, false);
    $csrf=$auth->csrfToken(); check(strlen($csrf)===64,'csrf token');
    denied(fn()=>$auth->requireCsrf('invalid'),403,'CSRF rejection');
    $auth->requireCsrf($csrf);
    check(!$auth->login($owner,'wrong password',$ipBase.'11'),'wrong password rejected');
    check($auth->user()===null,'failed login creates no user');
    for($i=1;$i<8;$i++) check(!$auth->login('nobody@example.test','invalid',$ipBase.'11'),'generic failure');
    denied(fn()=>$auth->login($owner,'only-for-isolated-test',$ipBase.'11'),429,'rate limit');
    $previous=session_id(); check($auth->login($owner,'only-for-isolated-test',$ipBase.'12'),'owner login');
    check(session_id()!==$previous,'login regenerates session id');
    denied(fn()=>$auth->requireCsrf($csrf),403,'CSRF token rotated after login');
    $auth->requireCsrf($auth->csrfToken());
    check($auth->requireOwner()['id']===$ids['owner'],'owner role');
    $auth->requireLocation($ids['wh']); $auth->requireLocation($ids['lb']);
    $managerService=new Optiman\UserManager($db,$auth);
    $newManager=['name'=>'Added manager','email'=>'added-'.$token.'@example.test','password'=>'long-test-password','role'=>'branch_manager','branch_id'=>$ids['a'],'is_active'=>true];
    $ids['added']=$managerService->create($newManager);
    $saved=$db->prepare('SELECT role,branch_id,password_hash FROM users WHERE id=?'); $saved->execute([$ids['added']]); $record=$saved->fetch();
    check($record['role']==='branch_manager' && (int)$record['branch_id']===$ids['a'] && password_verify('long-test-password',$record['password_hash']),'owner creates manager');
    denied(fn()=>$managerService->create($newManager),409,'duplicate user');
    denied(fn()=>$managerService->create(array_replace($newManager,['email'=>'bad-'.$token.'@example.test','branch_id'=>999999999])),422,'invalid branch');
    $managerService->update($ids['added'],array_replace($newManager,['branch_id'=>$ids['b'],'password'=>'']));
    $saved->execute([$ids['added']]); check((int)$saved->fetch()['branch_id']===$ids['b'],'owner reassigns branch');
    denied(fn()=>$managerService->update($ids['owner'],['name'=>'Owner','email'=>$owner,'role'=>'branch_manager','branch_id'=>$ids['a'],'is_active'=>true]),422,'owner self-demotion denied');
    $_SESSION['last_activity']=time()-61; check($auth->user()===null,'idle session expires');
    check($auth->login($manager,'only-for-isolated-test',$ipBase.'13'),'manager login');
    check($auth->requireUser()['branch_id']===$ids['a'],'manager branch');
    $auth->requireLocation($ids['la']);
    denied(fn()=>$auth->requireLocation($ids['lb']),403,'cross-branch deny');
    denied(fn()=>$auth->requireLocation($ids['wh']),403,'warehouse deny');
    denied(fn()=>$auth->requireOwner(),403,'owner-only deny');
    denied(fn()=>$managerService->create($newManager),403,'manager user administration denied');
    $db->prepare('UPDATE users SET is_active=0 WHERE id=?')->execute([$ids['manager']]);
    check($auth->user()===null,'disabled account invalidates session');
    check($auth->login($owner,'only-for-isolated-test',$ipBase.'14'),'owner relogin');
    $auth->logout(); check($auth->user()===null,'logout');
    echo "Auth integration passed: login, rate limit, CSRF, idle expiry, disabled account, role/location scope, user management and logout.\n";
} finally {
    // All test records are isolated by random identifiers.
    if(isset($ids['added'])) { $db->prepare('DELETE FROM users WHERE id=?')->execute([$ids['added']]); }
    if(isset($ids['owner'],$ids['manager'])) { $db->prepare('DELETE FROM audit_logs WHERE actor_id IN (?,?)')->execute([$ids['owner'],$ids['manager']]); $db->prepare('DELETE FROM users WHERE id IN (?,?)')->execute([$ids['owner'],$ids['manager']]); }
    foreach(['la','lb','wh'] as $key) if(isset($ids[$key])) $db->prepare('DELETE FROM inventory_locations WHERE id=?')->execute([$ids[$key]]);
    foreach(['a','b'] as $key) if(isset($ids[$key])) $db->prepare('DELETE FROM branches WHERE id=?')->execute([$ids[$key]]);
}
