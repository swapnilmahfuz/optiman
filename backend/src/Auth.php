<?php
declare(strict_types=1);

namespace Optiman;

use PDO;
use RuntimeException;

class AuthException extends RuntimeException
{
    public function __construct(string $message, public readonly int $status = 403) { parent::__construct($message); }
}
class RateLimitException extends AuthException
{
    public function __construct() { parent::__construct('Too many attempts. Please try again later.', 429); }
}

/** Server-side sessions and authorization. Trust only the direct REMOTE_ADDR, not forwarding headers. */
final class Auth
{
    private const DUMMY_HASH = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
    private const WINDOW_SECONDS = 900;
    private const MAX_ATTEMPTS = 8;
    private bool $started = false;

    public function __construct(private readonly PDO $db, private readonly string $secret, private readonly int $idleSeconds = 1800, private readonly bool $secureCookies = true)
    {
        if (strlen($secret) < 32 || $idleSeconds < 60) {
            throw new RuntimeException('Invalid session configuration.');
        }
    }

    public function start(): void
    {
        if ($this->started) return;
        if (session_status() === PHP_SESSION_ACTIVE) throw new RuntimeException('Session already started outside authentication.');
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.use_trans_sid', '0');
        session_name('optiman_admin');
        session_set_cookie_params(['lifetime'=>0, 'path'=>'/', 'secure'=>$this->secureCookies, 'httponly'=>true, 'samesite'=>'Strict']);
        if (!session_start()) throw new RuntimeException('Could not start session.');
        $this->started = true;
    }

    public function csrfToken(): string
    {
        $this->start();
        if (!isset($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
        return $_SESSION['csrf'];
    }

    public function requireCsrf(?string $token): void
    {
        $this->start();
        if (!is_string($token) || !isset($_SESSION['csrf']) || !is_string($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $token)) {
            throw new AuthException('Invalid or expired request token.', 403);
        }
    }

    /** Consume one attempt atomically before checking credentials. Fixed-window per direct IP. */
    private function consumeAttempt(string $ip): string
    {
        $key = hash_hmac('sha256', $ip, $this->secret);
        $now = time();
        $this->db->beginTransaction();
        try {
            $insert = $this->db->prepare('INSERT INTO login_throttle (key_hash, window_started, attempts) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE key_hash = VALUES(key_hash)');
            $insert->execute([$key, gmdate('Y-m-d H:i:s', $now)]);
            $select = $this->db->prepare('SELECT window_started, attempts FROM login_throttle WHERE key_hash = ? FOR UPDATE');
            $select->execute([$key]);
            $row = $select->fetch(PDO::FETCH_ASSOC);
            if (!$row) throw new RuntimeException('Unable to read login limit.');
            $start = strtotime($row['window_started'] . ' UTC');
            $count = (int)$row['attempts'];
            if ($start === false || $now - $start >= self::WINDOW_SECONDS || $now < $start) { $start = $now; $count = 0; }
            if ($count >= self::MAX_ATTEMPTS) {
                $this->db->commit();
                throw new RateLimitException();
            }
            $update = $this->db->prepare('UPDATE login_throttle SET window_started = ?, attempts = ? WHERE key_hash = ?');
            $update->execute([gmdate('Y-m-d H:i:s', $start), $count + 1, $key]);
            $this->db->commit();
            return $key;
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }

    public function login(string $email, string $password, string $ip): bool
    {
        $this->start();
        $key = $this->consumeAttempt($ip);
        $email = mb_strtolower(trim($email), 'UTF-8');
        // Bounds limit resource usage while preserving a generic failure response.
        if (strlen($email) > 254 || strlen($password) > 1024) { $email = ''; $password = ''; }
        $query = $this->db->prepare('SELECT u.id, u.name, u.email, u.password_hash, u.role, u.branch_id, u.is_active, b.is_active AS branch_active FROM users u LEFT JOIN branches b ON b.id = u.branch_id WHERE u.email = ? LIMIT 1');
        $query->execute([$email]);
        $row = $query->fetch(PDO::FETCH_ASSOC);
        $valid = password_verify($password, $row['password_hash'] ?? self::DUMMY_HASH);
        if (!$valid || !$row || !(int)$row['is_active'] || !in_array($row['role'], ['owner', 'branch_manager'], true) || ($row['role'] === 'branch_manager' && (!(int)$row['branch_id'] || !(int)$row['branch_active']))) {
            $this->audit(null, 'login_failed', 'session', null);
            return false;
        }
        if (!session_regenerate_id(true)) throw new RuntimeException('Could not regenerate session.');
        $_SESSION = ['user_id'=>(int)$row['id'], 'last_activity'=>time(), 'csrf'=>bin2hex(random_bytes(32))];
        $delete = $this->db->prepare('DELETE FROM login_throttle WHERE key_hash = ?');
        $delete->execute([$key]);
        $this->audit((int)$row['id'], 'login', 'session', null);
        return true;
    }

    /** Reload permissions every request: stale client role flags never grant access. */
    public function user(): ?array
    {
        $this->start();
        $id = $_SESSION['user_id'] ?? null;
        $last = $_SESSION['last_activity'] ?? null;
        if (!is_int($id) || !is_int($last) || time() - $last > $this->idleSeconds || time() < $last) {
            if ($id !== null) $this->clearSession();
            return null;
        }
        $query = $this->db->prepare('SELECT u.id, u.name, u.email, u.role, u.branch_id, u.is_active, b.is_active AS branch_active FROM users u LEFT JOIN branches b ON b.id = u.branch_id WHERE u.id = ? LIMIT 1');
        $query->execute([$id]);
        $row = $query->fetch(PDO::FETCH_ASSOC);
        if (!$row || !(int)$row['is_active'] || !in_array($row['role'], ['owner','branch_manager'], true) || ($row['role'] === 'branch_manager' && (!(int)$row['branch_id'] || !(int)$row['branch_active']))) {
            $this->clearSession();
            return null;
        }
        $_SESSION['last_activity'] = time();
        unset($row['is_active'], $row['branch_active']);
        $row['id'] = (int)$row['id'];
        $row['branch_id'] = $row['branch_id'] === null ? null : (int)$row['branch_id'];
        return $row;
    }

    public function requireUser(): array { return $this->user() ?? throw new AuthException('Authentication required.', 401); }
    public function requireOwner(): array
    {
        $user = $this->requireUser();
        if ($user['role'] !== 'owner') throw new AuthException('Access denied.', 403);
        return $user;
    }
    public function requireLocation(int $locationId): array
    {
        $user = $this->requireUser();
        $query = $this->db->prepare('SELECT id, name, code, type, branch_id, is_active FROM inventory_locations WHERE id = ? LIMIT 1');
        $query->execute([$locationId]);
        $location = $query->fetch(PDO::FETCH_ASSOC);
        if (!$location || !(int)$location['is_active'] || ($user['role'] !== 'owner' && ($location['type'] !== 'branch' || (int)$location['branch_id'] !== $user['branch_id']))) {
            throw new AuthException('Access denied.', 403);
        }
        return $location;
    }
    public function logout(): void
    {
        $user = $this->user();
        if ($user) $this->audit($user['id'], 'logout', 'session', null);
        $this->clearSession();
    }
    private function clearSession(): void
    {
        $_SESSION = [];
        if (!session_regenerate_id(true)) throw new RuntimeException('Could not regenerate session.');
    }
    public function audit(?int $actorId, string $action, string $entity, ?int $entityId, ?array $metadata = null): void
    {
        $statement = $this->db->prepare('INSERT INTO audit_logs (actor_id, action, entity, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())');
        $statement->execute([$actorId, $action, $entity, $entityId, $metadata === null ? null : json_encode($metadata, JSON_THROW_ON_ERROR)]);
    }
}
