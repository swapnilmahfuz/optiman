<?php
declare(strict_types=1);

namespace Optiman;

use InvalidArgumentException;
use RuntimeException;
use Throwable;

/** Produces product photos only. Transparent virtual try-on overlays must not use this service. */
final class ImageService
{
    private const SIZES = [320, 640, 1000];
    private const HARD_MAX_BYTES = 1800000; // 1.8 MB; always below hosting's 2 MiB limit.
    private const MAX_PIXELS = 8000000;
    private string $directory;
    private int $maxBytes;

    public function __construct(string $directory, int $maxBytes = self::HARD_MAX_BYTES)
    {
        $resolved = realpath($directory);
        if ($resolved === false || !is_dir($resolved) || !is_writable($resolved)) {
            throw new RuntimeException('Product image storage is unavailable.');
        }
        $this->directory = $resolved;
        $this->maxBytes = max(1, min(self::HARD_MAX_BYTES, $maxBytes));
    }

    /**
     * Accepts a single element from $_FILES. Returns a random basename for all three files.
     * The caller must enforce image count and commit metadata transactionally, then call
     * delete() if that transaction fails. Never persist paths supplied by the uploader.
     */
    public function process(array $upload): string
    {
        $error = (int)($upload['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE) {
            throw new InvalidArgumentException('Image exceeds the upload limit. Choose a file under 1.8 MB.');
        }
        if ($error !== UPLOAD_ERR_OK || !isset($upload['tmp_name']) || !is_string($upload['tmp_name'])) {
            throw new InvalidArgumentException('Image upload failed. Please select a JPEG, PNG or WebP image.');
        }
        $path = $upload['tmp_name'];
        if (!is_uploaded_file($path)) {
            throw new InvalidArgumentException('Invalid uploaded image.');
        }
        $size = filesize($path);
        if ($size === false || $size < 1 || $size > $this->maxBytes) {
            throw new InvalidArgumentException('Image exceeds the allowed file size.');
        }
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($path);
        $info = @getimagesize($path);
        $allowed = ['image/jpeg' => IMAGETYPE_JPEG, 'image/png' => IMAGETYPE_PNG, 'image/webp' => IMAGETYPE_WEBP];
        if (!is_array($info) || !is_string($mime) || !isset($allowed[$mime]) || $info[2] !== $allowed[$mime]) {
            throw new InvalidArgumentException('Choose a valid JPEG, PNG or WebP image.');
        }
        [$width, $height] = $info;
        if ($width < 1 || $height < 1 || $width > self::MAX_PIXELS || $height > self::MAX_PIXELS || $width * $height > self::MAX_PIXELS) {
            throw new InvalidArgumentException('Image dimensions are too large.');
        }
        if (!function_exists('imagewebp')) {
            throw new RuntimeException('WebP image processing is unavailable.');
        }
        // Bound working memory, allowing room for GD buffers, 1000px output and PHP runtime.
        $limit = self::memoryLimitBytes((string)ini_get('memory_limit'));
        if ($limit > 0 && memory_get_usage(true) + $width * $height * 6 + 16 * 1024 * 1024 > $limit) {
            throw new InvalidArgumentException('Image dimensions exceed the server processing limit.');
        }
        $bytes = file_get_contents($path);
        $source = $bytes === false ? false : @imagecreatefromstring($bytes);
        unset($bytes);
        if ($source === false) {
            throw new InvalidArgumentException('This image could not be decoded.');
        }
        $base = bin2hex(random_bytes(16));
        try {
            foreach (self::SIZES as $side) {
                $canvas = imagecreatetruecolor($side, $side);
                if ($canvas === false) throw new RuntimeException('Image processing failed.');
                try {
                    $background = imagecolorallocate($canvas, 247, 241, 231);
                    imagefill($canvas, 0, 0, $background);
                    // Ten percent total padding, identical for every output size.
                    $factor = min(($side * .90) / $width, ($side * .90) / $height);
                    $outWidth = max(1, (int)round($width * $factor));
                    $outHeight = max(1, (int)round($height * $factor));
                    $x = intdiv($side - $outWidth, 2);
                    $y = intdiv($side - $outHeight, 2);
                    if (!imagecopyresampled($canvas, $source, $x, $y, 0, 0, $outWidth, $outHeight, $width, $height)) {
                        throw new RuntimeException('Image processing failed.');
                    }
                    $target = $this->filePath($base, $side);
                    if (!imagewebp($canvas, $target, 82)) throw new RuntimeException('Image storage failed.');
                    $output = @getimagesize($target);
                    if ($output === false || $output[0] !== $side || $output[1] !== $side || $output[2] !== IMAGETYPE_WEBP) {
                        throw new RuntimeException('Image output verification failed.');
                    }
                    @chmod($target, 0644);
                } finally {
                    imagedestroy($canvas);
                }
            }
        } catch (Throwable $e) {
            $this->delete($base);
            throw $e;
        } finally {
            imagedestroy($source);
        }
        return $base;
    }

    /** Delete only paths that this service could have created. */
    public function delete(string $basename): void
    {
        if (!preg_match('/\A[a-f0-9]{32}\z/D', $basename)) throw new InvalidArgumentException('Invalid image identifier.');
        foreach (self::SIZES as $side) {
            $file = $this->filePath($basename, $side);
            if (is_file($file) && !unlink($file)) throw new RuntimeException('Image cleanup failed.');
        }
    }

    private function filePath(string $base, int $side): string
    {
        return $this->directory . DIRECTORY_SEPARATOR . $base . '-' . $side . '.webp';
    }

    private static function memoryLimitBytes(string $value): int
    {
        $value = trim($value);
        if ($value === '' || $value === '-1') return 0;
        $unit = strtolower(substr($value, -1));
        $number = (int)$value;
        return match ($unit) {'g' => $number * 1073741824, 'm' => $number * 1048576, 'k' => $number * 1024, default => $number};
    }
}
