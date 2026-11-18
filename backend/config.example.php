<?php
declare(strict_types=1);
// Copy outside public_html as config.php; replace every placeholder locally.
return [
    'db' => [
        'host' => 'localhost', 'port' => 3306, 'name' => 'REPLACE_DATABASE',
        'user' => 'REPLACE_DATABASE_USER', 'password' => 'REPLACE_DATABASE_PASSWORD',
        'charset' => 'utf8mb4',
    ],
    // Generate a unique cryptographically random secret at least 32 bytes long.
    'app_secret' => 'REPLACE_WITH_LONG_RANDOM_SECRET_AT_LEAST_32_BYTES',
    'session_secure' => true,
    'session_idle_seconds' => 1800,
    // A directory on the same filesystem for safe staging, not a URL.
    'upload_path' => __DIR__ . '/public/uploads/products',
    'upload_max_bytes' => 1800000,
    'upload_max_images' => 5,
];
