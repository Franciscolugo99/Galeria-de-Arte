<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
require_admin();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $workId = filter_input(INPUT_GET, 'work_id', FILTER_VALIDATE_INT);
    if (!$workId) {
        json_response(['error' => 'Falta indicar la obra.'], 422);
    }
    $statement = db()->prepare('SELECT id, image_path, thumbnail_path, alt_text, is_cover, sort_order FROM work_images WHERE work_id = ? ORDER BY is_cover DESC, sort_order, id');
    $statement->execute([$workId]);
    $images = array_map(static fn(array $row): array => [
        'id' => (int) $row['id'],
        'imagePath' => $row['image_path'],
        'thumbnailPath' => $row['thumbnail_path'],
        'altText' => $row['alt_text'],
        'isCover' => (bool) $row['is_cover'],
    ], $statement->fetchAll());
    json_response(['images' => $images]);
}

verify_csrf();

if ($method === 'PATCH') {
    $input = json_input();
    $imageId = (int) ($input['imageId'] ?? 0);
    $statement = db()->prepare('SELECT work_id FROM work_images WHERE id = ?');
    $statement->execute([$imageId]);
    $workId = (int) $statement->fetchColumn();
    if (!$workId) {
        json_response(['error' => 'La imagen no existe.'], 404);
    }
    db()->beginTransaction();
    db()->prepare('UPDATE work_images SET is_cover = 0 WHERE work_id = ?')->execute([$workId]);
    db()->prepare('UPDATE work_images SET is_cover = 1 WHERE id = ?')->execute([$imageId]);
    db()->commit();
    json_response(['ok' => true]);
}

if ($method === 'DELETE') {
    $input = json_input();
    $imageId = (int) ($input['imageId'] ?? 0);
    $statement = db()->prepare('SELECT work_id, original_path, image_path, thumbnail_path, is_cover FROM work_images WHERE id = ?');
    $statement->execute([$imageId]);
    $image = $statement->fetch();
    if (!$image) {
        json_response(['error' => 'La imagen no existe.'], 404);
    }
    db()->prepare('DELETE FROM work_images WHERE id = ?')->execute([$imageId]);
    if ((bool) $image['is_cover']) {
        $next = db()->prepare('SELECT id FROM work_images WHERE work_id = ? ORDER BY sort_order, id LIMIT 1');
        $next->execute([(int) $image['work_id']]);
        $nextId = (int) $next->fetchColumn();
        if ($nextId) {
            db()->prepare('UPDATE work_images SET is_cover = 1 WHERE id = ?')->execute([$nextId]);
        }
    }
    delete_stored_image_files($image);
    json_response(['ok' => true]);
}

if ($method !== 'POST') {
    json_response(['error' => 'Método no permitido.'], 405);
}

$workId = filter_input(INPUT_POST, 'work_id', FILTER_VALIDATE_INT);
if (!$workId || empty($_FILES['images'])) {
    json_response(['error' => 'Seleccioná al menos una fotografía.'], 422);
}

if (!extension_loaded('gd') || !function_exists('imagecreatefromstring') || !function_exists('imagewebp')) {
    json_response(['error' => 'El servidor no puede procesar imágenes en este momento. Contactá a la persona encargada del sitio.'], 503);
}

$workStatement = db()->prepare('SELECT title FROM works WHERE id = ?');
$workStatement->execute([$workId]);
$workTitle = $workStatement->fetchColumn();
if (!is_string($workTitle) || $workTitle === '') {
    json_response(['error' => 'La obra no existe.'], 404);
}

$config = app_config();
$files = $_FILES['images'];
$tmpNames = is_array($files['tmp_name']) ? $files['tmp_name'] : [$files['tmp_name']];
$sizes = is_array($files['size']) ? $files['size'] : [$files['size']];
$errors = is_array($files['error']) ? $files['error'] : [$files['error']];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$allowed = ['image/jpeg', 'image/png', 'image/webp'];

foreach ([$config['upload_dir'], $config['original_dir']] as $directory) {
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
        throw new RuntimeException('No se pudo preparar el almacenamiento de imágenes.');
    }
}

$existing = db()->prepare('SELECT COUNT(*) FROM work_images WHERE work_id = ?');
$existing->execute([$workId]);
$imageCount = (int) $existing->fetchColumn();
$uploaded = [];

foreach ($tmpNames as $index => $tmpName) {
    $uploadError = $errors[$index] ?? UPLOAD_ERR_NO_FILE;
    if ($uploadError === UPLOAD_ERR_NO_FILE) {
        continue;
    }
    if (in_array($uploadError, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
        json_response(['error' => 'Una fotografía supera el máximo permitido de 15 MB.'], 422);
    }
    if ($uploadError === UPLOAD_ERR_PARTIAL) {
        json_response(['error' => 'Una fotografía no terminó de cargarse. Volvé a intentarlo.'], 422);
    }
    if ($uploadError !== UPLOAD_ERR_OK) {
        json_response(['error' => 'No pudimos recibir una de las fotografías. Volvé a intentarlo.'], 422);
    }
    if (($sizes[$index] ?? 0) > $config['max_upload_bytes']) {
        json_response(['error' => 'Una fotografía supera el máximo de 15 MB.'], 422);
    }
    $mime = $finfo->file($tmpName);
    if (!in_array($mime, $allowed, true)) {
        json_response(['error' => 'Solo se aceptan fotografías JPG, PNG o WebP.'], 422);
    }
    $sourceData = file_get_contents($tmpName);
    $source = $sourceData !== false ? imagecreatefromstring($sourceData) : false;
    if (!$source) {
        json_response(['error' => 'No pudimos leer una de las fotografías.'], 422);
    }

    if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
        $exif = @exif_read_data($tmpName);
        $orientation = (int) ($exif['Orientation'] ?? 1);
        $rotation = null;
        if ($orientation === 3) {
            $rotation = 180;
        } elseif ($orientation === 6) {
            $rotation = -90;
        } elseif ($orientation === 8) {
            $rotation = 90;
        }
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
    $token = bin2hex(random_bytes(12));
    $originalExtension = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$mime];
    $originalFile = $config['original_dir'] . '/' . $token . '.' . $originalExtension;
    if (!move_uploaded_file($tmpName, $originalFile)) {
        imagedestroy($source);
        throw new RuntimeException('No se pudo guardar la fotografía original.');
    }

    $makeVersion = static function (int $maxWidth, string $suffix) use ($source, $sourceWidth, $sourceHeight, $token, $config): array {
        $ratio = min(1, $maxWidth / $sourceWidth);
        $width = max(1, (int) round($sourceWidth * $ratio));
        $height = max(1, (int) round($sourceHeight * $ratio));
        $canvas = imagecreatetruecolor($width, $height);
        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);
        imagecopyresampled($canvas, $source, 0, 0, 0, 0, $width, $height, $sourceWidth, $sourceHeight);
        $fileName = $token . '-' . $suffix . '.webp';
        imagewebp($canvas, $config['upload_dir'] . '/' . $fileName, 84);
        imagedestroy($canvas);
        return [$fileName, $width, $height];
    };

    [$largeName, $width, $height] = $makeVersion(2000, 'gallery');
    [$thumbName] = $makeVersion(640, 'thumb');
    imagedestroy($source);

    $isCover = $imageCount === 0 && $index === 0 ? 1 : 0;
    $alt = sprintf('%s, fotografía %d', $workTitle, $imageCount + $index + 1);
    $statement = db()->prepare('INSERT INTO work_images (work_id, original_path, image_path, thumbnail_path, alt_text, width_px, height_px, sort_order, is_cover) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $statement->execute([$workId, $originalFile, $config['upload_url'] . '/' . $largeName,
        $config['upload_url'] . '/' . $thumbName, $alt, $width, $height, ($imageCount + $index) * 10, $isCover]);
    $uploaded[] = (int) db()->lastInsertId();
}

json_response(['ok' => true, 'uploaded' => count($uploaded)]);
