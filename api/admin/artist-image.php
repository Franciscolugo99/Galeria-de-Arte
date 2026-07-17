<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
require_admin();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_response(['error' => 'Método no permitido.'], 405);
}
verify_csrf();

if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    json_response(['error' => 'Seleccioná una fotografía.'], 422);
}

$config = app_config();
$file = $_FILES['image'];
if ((int) $file['size'] > $config['max_upload_bytes']) {
    json_response(['error' => 'La fotografía supera el máximo de 15 MB.'], 422);
}
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
    json_response(['error' => 'Solo se aceptan fotografías JPG, PNG o WebP.'], 422);
}
$data = file_get_contents($file['tmp_name']);
$source = $data !== false ? imagecreatefromstring($data) : false;
if (!$source) {
    json_response(['error' => 'No pudimos leer la fotografía.'], 422);
}

if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
    $exif = @exif_read_data($file['tmp_name']);
    $orientation = (int) ($exif['Orientation'] ?? 1);
    $rotation = match ($orientation) {
        3 => 180,
        6 => -90,
        8 => 90,
        default => null,
    };
    if ($rotation !== null) {
        $rotated = imagerotate($source, $rotation, 0);
        if ($rotated !== false) {
            imagedestroy($source);
            $source = $rotated;
        }
    }
}

$sourceWidth = imagesx($source);
$sourceHeight = imagesy($source);
$maxWidth = 1400;
$ratio = min(1, $maxWidth / $sourceWidth);
$width = max(1, (int) round($sourceWidth * $ratio));
$height = max(1, (int) round($sourceHeight * $ratio));
$canvas = imagecreatetruecolor($width, $height);
imagecopyresampled($canvas, $source, 0, 0, 0, 0, $width, $height, $sourceWidth, $sourceHeight);

if (!is_dir($config['profile_upload_dir']) && !mkdir($config['profile_upload_dir'], 0755, true) && !is_dir($config['profile_upload_dir'])) {
    throw new RuntimeException('No se pudo preparar el almacenamiento.');
}
$fileName = 'artista-' . bin2hex(random_bytes(8)) . '.webp';
$filePath = $config['profile_upload_dir'] . '/' . $fileName;
imagewebp($canvas, $filePath, 84);
imagedestroy($canvas);
imagedestroy($source);

$previous = all_settings()['artist_photo'];
$url = $config['profile_upload_url'] . '/' . $fileName;
$statement = db()->prepare('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)');
$statement->execute(['artist_photo', $url]);

if (str_starts_with($previous, $config['profile_upload_url'] . '/')) {
    $previousFile = $config['profile_upload_dir'] . '/' . basename($previous);
    if (is_file($previousFile)) {
        @unlink($previousFile);
    }
}

json_response(['ok' => true, 'url' => $url, 'message' => 'Fotografía actualizada.']);
