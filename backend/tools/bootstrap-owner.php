<?php
declare(strict_types=1);
// Run only on a trusted local computer, never on the public web server.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if ($argc !== 2 || file_exists($argv[1])) {
    fwrite(STDERR, "Usage: php bootstrap-owner.php /private/path/new-owner-bootstrap.sql\nChoose a new file outside the web root.\n"); exit(1);
}
function prompt(string $label): string {
    fwrite(STDERR, $label); $value = fgets(STDIN);
    if ($value === false) { fwrite(STDERR, "Input cancelled.\n"); exit(1); }
    return rtrim($value, "\r\n");
}
$name = trim(prompt('Owner name: '));
$email = strtolower(trim(prompt('Owner email: ')));
fwrite(STDERR, "Password input is visible in this terminal. Use a private computer and do not record the screen.\n");
$password = prompt('New password (12 to 72 bytes): ');
$repeat = prompt('Repeat password: ');
if ($name === '' || mb_strlen($name, 'UTF-8') > 120 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190 || strlen($password) < 12 || strlen($password) > 72 || !hash_equals($password, $repeat)) {
    fwrite(STDERR, "Invalid name, email, password length, or mismatched password. No file created.\n"); exit(1);
}
$hash = password_hash($password, PASSWORD_DEFAULT);
$password = $repeat = '';
if ($hash === false) { fwrite(STDERR, "Password hashing failed.\n"); exit(1); }
$hex = static fn(string $value): string => "CONVERT(UNHEX('" . bin2hex($value) . "') USING utf8mb4)";
$sql = "-- One-time first Owner bootstrap. Contains a password hash; keep private and delete after import.\n" .
       "INSERT INTO users (name,email,password_hash,role,branch_id,is_active) SELECT " .
       $hex($name) . ',' . $hex($email) . ',' . $hex($hash) . ",'owner',NULL,1 WHERE NOT EXISTS (SELECT 1 FROM users);\n";
$handle = fopen($argv[1], 'x');
if ($handle === false) { fwrite(STDERR, "Could not create new output file.\n"); exit(1); }
@chmod($argv[1], 0600);
$written = fwrite($handle, $sql); fclose($handle);
if ($written !== strlen($sql)) { @unlink($argv[1]); fwrite(STDERR, "Writing failed; file removed.\n"); exit(1); }
fwrite(STDERR, "Private SQL file created. Import once into the NEW migrated database using phpMyAdmin, verify one row inserted, then delete the file.\n");
