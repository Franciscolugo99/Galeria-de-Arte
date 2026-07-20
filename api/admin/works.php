<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';

require_admin();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function admin_work_select(): string
{
    return <<<'SQL'
SELECT w.*, c.name AS category_name,
       COALESCE(cover.thumbnail_path, cover.image_path, '') AS thumbnail,
       (SELECT COUNT(*) FROM work_images wi WHERE wi.work_id = w.id) AS image_count
FROM works w
LEFT JOIN categories c ON c.id = w.category_id
LEFT JOIN work_images cover ON cover.work_id = w.id AND cover.is_cover = 1
SQL;
}

function normalize_work(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'categoryId' => $row['category_id'] ? (int) $row['category_id'] : null,
        'category' => $row['category_name'] ?? 'Sin categoría',
        'title' => $row['title'],
        'slug' => $row['slug'],
        'description' => $row['description'] ?? '',
        'technique' => $row['technique'] ?? '',
        'widthCm' => $row['width_cm'] !== null ? (float) $row['width_cm'] : null,
        'heightCm' => $row['height_cm'] !== null ? (float) $row['height_cm'] : null,
        'year' => $row['year'] ? (int) $row['year'] : null,
        'availabilityStatus' => $row['availability_status'],
        'publicationStatus' => $row['publication_status'],
        'visibility' => $row['visibility'],
        'isFeatured' => (bool) $row['is_featured'],
        'featuredOrder' => (int) $row['featured_order'],
        'thumbnail' => $row['thumbnail'] ?? '',
        'imageCount' => (int) ($row['image_count'] ?? 0),
        'updatedAt' => $row['updated_at'],
    ];
}

if ($method === 'GET') {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if ($id) {
        $statement = db()->prepare(admin_work_select() . ' WHERE w.id = ? GROUP BY w.id');
        $statement->execute([$id]);
        $work = $statement->fetch();
        if (!$work) {
            json_response(['error' => 'La obra no existe.'], 404);
        }
        json_response(['work' => normalize_work($work)]);
    }

    $status = $_GET['status'] ?? '';
    $search = trim((string) ($_GET['search'] ?? ''));
    $where = [];
    $params = [];
    if (in_array($status, ['draft', 'published'], true)) {
        $where[] = 'w.publication_status = ?';
        $params[] = $status;
    }
    if ($search !== '') {
        $where[] = '(w.title LIKE ? OR w.technique LIKE ?)';
        $params[] = '%' . $search . '%';
        $params[] = '%' . $search . '%';
    }
    $sql = admin_work_select()
        . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
        . ' GROUP BY w.id ORDER BY w.updated_at DESC, w.id DESC';
    $statement = db()->prepare($sql);
    $statement->execute($params);
    $summary = db()->query("SELECT COUNT(*) AS total, SUM(publication_status = 'published') AS published, SUM(publication_status = 'draft') AS drafts FROM works")->fetch();
    json_response([
        'works' => array_map('normalize_work', $statement->fetchAll()),
        'summary' => [
            'total' => (int) $summary['total'],
            'published' => (int) $summary['published'],
            'drafts' => (int) $summary['drafts'],
        ],
    ]);
}

verify_csrf();

if ($method === 'DELETE') {
    $input = json_input();
    $id = (int) ($input['id'] ?? 0);
    if ($id < 1) {
        json_response(['error' => 'Falta indicar la obra.'], 422);
    }
    $imagesStatement = db()->prepare('SELECT original_path, image_path, thumbnail_path FROM work_images WHERE work_id = ?');
    $imagesStatement->execute([$id]);
    $images = $imagesStatement->fetchAll();
    $statement = db()->prepare('DELETE FROM works WHERE id = ?');
    $statement->execute([$id]);
    foreach ($images as $image) {
        delete_stored_image_files($image);
    }
    json_response(['ok' => true]);
}

if (!in_array($method, ['POST', 'PUT'], true)) {
    json_response(['error' => 'Método no permitido.'], 405);
}

$input = json_input();
$id = isset($input['id']) ? (int) $input['id'] : null;
$title = trim((string) ($input['title'] ?? ''));
if (mb_strlen($title) < 2 || mb_strlen($title) > 180) {
    json_response(['error' => 'Escribí un título de entre 2 y 180 caracteres.'], 422);
}

$categoryId = !empty($input['categoryId']) ? (int) $input['categoryId'] : null;
$technique = trim((string) ($input['technique'] ?? '')) ?: null;
$description = trim((string) ($input['description'] ?? '')) ?: null;
$width = ($input['widthCm'] ?? '') !== '' ? (float) $input['widthCm'] : null;
$height = ($input['heightCm'] ?? '') !== '' ? (float) $input['heightCm'] : null;
$year = ($input['year'] ?? '') !== '' ? (int) $input['year'] : null;
$availability = in_array($input['availabilityStatus'] ?? '', ['consult', 'available', 'sold', 'commission'], true)
    ? $input['availabilityStatus'] : 'consult';
$publication = in_array($input['publicationStatus'] ?? '', ['draft', 'published'], true)
    ? $input['publicationStatus'] : 'draft';
$visibility = in_array($input['visibility'] ?? '', ['public', 'private'], true)
    ? $input['visibility'] : 'public';
$featured = !empty($input['isFeatured']) ? 1 : 0;
$featuredOrder = max(0, (int) ($input['featuredOrder'] ?? 0));

if ($year !== null && ($year < 1800 || $year > ((int) date('Y') + 1))) {
    json_response(['error' => 'Revisá el año de la obra.'], 422);
}
if (($width !== null && $width <= 0) || ($height !== null && $height <= 0)) {
    json_response(['error' => 'Las medidas deben ser mayores que cero.'], 422);
}

$slug = unique_work_slug($title, $id);
$publishedAt = $publication === 'published' ? date('Y-m-d H:i:s') : null;

if ($id) {
    $sql = <<<'SQL'
UPDATE works SET category_id = ?, title = ?, slug = ?, description = ?, technique = ?, width_cm = ?,
 height_cm = ?, year = ?, availability_status = ?, publication_status = ?, visibility = ?,
 is_featured = ?, featured_order = ?, published_at = COALESCE(published_at, ?)
WHERE id = ?
SQL;
    $statement = db()->prepare($sql);
    $statement->execute([$categoryId, $title, $slug, $description, $technique, $width, $height, $year,
        $availability, $publication, $visibility, $featured, $featuredOrder, $publishedAt, $id]);
} else {
    $sql = <<<'SQL'
INSERT INTO works (category_id, title, slug, description, technique, width_cm, height_cm, year,
 availability_status, publication_status, visibility, is_featured, featured_order, published_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
SQL;
    $statement = db()->prepare($sql);
    $statement->execute([$categoryId, $title, $slug, $description, $technique, $width, $height, $year,
        $availability, $publication, $visibility, $featured, $featuredOrder, $publishedAt]);
    $id = (int) db()->lastInsertId();
}

json_response(['ok' => true, 'id' => $id, 'message' => $publication === 'published' ? 'Obra publicada.' : 'Borrador guardado.']);
