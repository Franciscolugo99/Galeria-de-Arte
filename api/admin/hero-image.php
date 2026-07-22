<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
require_admin();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_response(['error' => 'Método no permitido.'], 405);
}
verify_csrf();

$target = trim((string) ($_POST['target'] ?? ''));
$targets = [
    'large' => [
        'key' => 'hero_large_image',
        'prefix' => 'portada-grande',
        'max_width' => 1800,
        'message' => 'Portada grande actualizada.',
    ],
    'small' => [
        'key' => 'hero_small_image',
        'prefix' => 'portada-chica',
        'max_width' => 900,
        'message' => 'Portada chica actualizada.',
    ],
    'commission' => [
        'key' => 'commission_image',
        'prefix' => 'encargos',
        'max_width' => 1600,
        'message' => 'Imagen de encargos actualizada.',
    ],
];

if (!array_key_exists($target, $targets)) {
    json_response(['error' => 'Indicá qué imagen de portada querés actualizar.'], 422);
}

if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    json_response(['error' => 'Seleccioná una fotografía.'], 422);
}

if (!extension_loaded('gd') || !function_exists('imagecreatefromstring') || !function_exists('imagewebp')) {
    json_response(['error' => 'El servidor no puede procesar imágenes en este momento.'], 503);
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

$dimensions = @getimagesize($file['tmp_name']);
if ($dimensions === false) {
    json_response(['error' => 'No pudimos leer las dimensiones de la fotografía.'], 422);
}

$pixelWidth = (int) ($dimensions[0] ?? 0);
$pixelHeight = (int) ($dimensions[1] ?? 0);
$maxPixels = (int) ($config['max_image_pixels'] ?? 24_000_000);
$maxSide = (int) ($config['max_image_side'] ?? 7000);
if ($pixelWidth < 1 || $pixelHeight < 1 || $pixelWidth > $maxSide || $pixelHeight > $maxSide || ($pixelWidth * $pixelHeight) > $maxPixels) {
    json_response(['error' => 'La fotografía es demasiado grande. Exportala con menos resolución y volvé a subirla.'], 422);
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
$maxWidth = (int) $targets[$target]['max_width'];
$ratio = min(1, $maxWidth / $sourceWidth);
$width = max(1, (int) round($sourceWidth * $ratio));
$height = max(1, (int) round($sourceHeight * $ratio));
$canvas = imagecreatetruecolor($width, $height);
imagealphablending($canvas, false);
imagesavealpha($canvas, true);
imagecopyresampled($canvas, $source, 0, 0, 0, 0, $width, $height, $sourceWidth, $sourceHeight);

if (!is_dir($config['profile_upload_dir']) && !mkdir($config['profile_upload_dir'], 0755, true) && !is_dir($config['profile_upload_dir'])) {
    imagedestroy($canvas);
    imagedestroy($source);
    throw new RuntimeException('No se pudo preparar el almacenamiento.');
}

$fileName = $targets[$target]['prefix'] . '-' . bin2hex(random_bytes(8)) . '.webp';
$filePath = $config['profile_upload_dir'] . '/' . $fileName;
$created = imagewebp($canvas, $filePath, 86);
imagedestroy($canvas);
imagedestroy($source);

if (!$created) {
    throw new RuntimeException('No se pudo generar la imagen optimizada.');
}

$settings = all_settings();
$settingKey = (string) $targets[$target]['key'];
$previous = (string) ($settings[$settingKey] ?? '');
$url = $config['profile_upload_url'] . '/' . $fileName;

$statement = db()->prepare('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)');
$statement->execute([$settingKey, $url]);

if (str_starts_with($previous, $config['profile_upload_url'] . '/')) {
    $previousFile = $config['profile_upload_dir'] . '/' . basename($previous);
    if (is_file($previousFile)) {
        @unlink($previousFile);
    }
}

json_response(['ok' => true, 'url' => $url, 'message' => $targets[$target]['message']]);
