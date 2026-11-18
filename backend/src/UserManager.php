<?php
declare(strict_types=1);
namespace Optiman;

use PDO;
use PDOException;
use Throwable;

/** Owner-only user administration. Never returns password hashes. */
final class UserManager
{
    public function __construct(private readonly PDO $db, private readonly Auth $auth) {}

    public function list(int $page = 1, int $limit = 25): array
    {
        $this->auth->requireOwner();
        $page = max(1, min(100000, $page)); $limit = max(1, min(100, $limit));
        $count = (int)$this->db->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $query = $this->db->prepare('SELECT id,name,email,role,branch_id,is_active,created_at,updated_at FROM users ORDER BY id LIMIT ? OFFSET ?');
        $query->bindValue(1, $limit, PDO::PARAM_INT);
        $query->bindValue(2, min(($page - 1) * $limit, PHP_INT_MAX), PDO::PARAM_INT);
        $query->execute();
        return ['items'=>$query->fetchAll(PDO::FETCH_ASSOC), 'page'=>$page, 'limit'=>$limit, 'total'=>$count];
    }

    /** Full record update; omit password to retain existing hash. */
    private function validate(array $data, bool $create): array
    {
        $name = trim(is_string($data['name'] ?? null) ? $data['name'] : '');
        $email = mb_strtolower(trim(is_string($data['email'] ?? null) ? $data['email'] : ''), 'UTF-8');
        $role = $data['role'] ?? '';
        $active = $data['is_active'] ?? true;
        $branch = $data['branch_id'] ?? null;
        $password = $data['password'] ?? null;
        if ($name === '' || mb_strlen($name, 'UTF-8') > 120 || strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new AuthException('A valid name and email are required.', 422);
        if (!is_string($role) || !in_array($role, ['owner','branch_manager'], true)) throw new AuthException('Invalid role.', 422);
        if (!is_bool($active) && !in_array($active, [0,1,'0','1'], true)) throw new AuthException('Invalid account status.', 422);
        if ($role === 'owner') {
            if ($branch !== null && $branch !== '') throw new AuthException('Owners cannot be assigned to one branch.', 422);
            $branch = null;
        } else {
            if (!(is_int($branch) || (is_string($branch) && ctype_digit($branch))) || (int)$branch <= 0) throw new AuthException('An active branch is required.', 422);
            $branch = (int)$branch;
        }
        if ($password === '') $password = null;
        if (($create && $password === null) || ($password !== null && (!is_string($password) || strlen($password) < 12 || strlen($password) > 72))) throw new AuthException('Password must be 12 to 72 bytes.', 422);
        return ['name'=>$name,'email'=>$email,'role'=>$role,'branch_id'=>$branch,'is_active'=>(int)(bool)$active,'password'=>$password];
    }

    private function checkBranch(?int $branch): void
    {
        if ($branch === null) return;
        $q = $this->db->prepare('SELECT id FROM branches WHERE id = ? AND is_active = 1 FOR UPDATE');
        $q->execute([$branch]);
        if (!$q->fetchColumn()) throw new AuthException('An active branch is required.', 422);
    }

    public function create(array $data): int
    {
        $actor = $this->auth->requireOwner();
        $user = $this->validate($data, true);
        $this->db->beginTransaction();
        try {
            $q = $this->db->prepare("SELECT id FROM users WHERE id=? AND role='owner' AND is_active=1 FOR UPDATE");
            $q->execute([$actor['id']]);
            if (!$q->fetchColumn()) throw new AuthException('Access denied.', 403);
            $this->checkBranch($user['branch_id']);
            $hash = password_hash($user['password'], PASSWORD_DEFAULT);
            if ($hash === false) throw new \RuntimeException('Unable to hash password.');
            $q = $this->db->prepare('INSERT INTO users (name,email,password_hash,role,branch_id,is_active) VALUES (?,?,?,?,?,?)');
            $q->execute([$user['name'],$user['email'],$hash,$user['role'],$user['branch_id'],$user['is_active']]);
            $id = (int)$this->db->lastInsertId();
            $this->auth->audit($actor['id'], 'create', 'user', $id, ['role'=>$user['role'],'branch_id'=>$user['branch_id']]);
            $this->db->commit(); return $id;
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            if ($e instanceof PDOException && ($e->errorInfo[1] ?? null) === 1062) throw new AuthException('Email is already in use.', 409);
            throw $e;
        }
    }

    public function update(int $id, array $data): void
    {
        $actor = $this->auth->requireOwner();
        $user = $this->validate($data, false);
        if ($id <= 0) throw new AuthException('User not found.', 404);
        $this->db->beginTransaction();
        try {
            // Lock owners in a consistent order so concurrent changes cannot remove the last owner.
            $owners = $this->db->query("SELECT id,is_active FROM users WHERE role='owner' ORDER BY id FOR UPDATE")->fetchAll(PDO::FETCH_ASSOC);
            if (!array_filter($owners, static fn(array $owner): bool => (int)$owner['id'] === $actor['id'] && (int)$owner['is_active'] === 1)) throw new AuthException('Access denied.', 403);
            $q = $this->db->prepare('SELECT id,role,is_active FROM users WHERE id=? FOR UPDATE');
            $q->execute([$id]); $old = $q->fetch(PDO::FETCH_ASSOC);
            if (!$old) throw new AuthException('User not found.', 404);
            if ($id === $actor['id'] && ($user['role'] !== 'owner' || !$user['is_active'])) throw new AuthException('You cannot deactivate or demote your own account.', 422);
            if ($old['role'] === 'owner' && (int)$old['is_active'] === 1 && ($user['role'] !== 'owner' || !$user['is_active'])) {
                $active = count(array_filter($owners, static fn(array $owner): bool => (int)$owner['is_active'] === 1));
                if ($active <= 1) throw new AuthException('At least one active owner is required.', 422);
            }
            $this->checkBranch($user['branch_id']);
            $params = [$user['name'],$user['email'],$user['role'],$user['branch_id'],$user['is_active']];
            $sql = 'UPDATE users SET name=?,email=?,role=?,branch_id=?,is_active=?';
            if ($user['password'] !== null) { $hash = password_hash($user['password'], PASSWORD_DEFAULT); if ($hash === false) throw new \RuntimeException('Unable to hash password.'); $sql .= ',password_hash=?'; $params[] = $hash; }
            $sql .= ' WHERE id=?'; $params[] = $id;
            $this->db->prepare($sql)->execute($params);
            $this->auth->audit($actor['id'], 'update', 'user', $id, ['role'=>$user['role'],'branch_id'=>$user['branch_id'],'is_active'=>$user['is_active']]);
            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            if ($e instanceof PDOException && ($e->errorInfo[1] ?? null) === 1062) throw new AuthException('Email is already in use.', 409);
            throw $e;
        }
    }
}
