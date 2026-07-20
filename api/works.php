<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_response(['error' => 'Método no permitido.'], 405);
}

$sql = <<<'SQL'
SELECT w.id, w.title, w.slug, w.description, w.technique, w.width_cm, w.height_cm,
       w.year, w.availability_status, c.name AS category,
       COALESCE(cover.image_path, '') AS image, COALESCE(cover.alt_text, w.title) AS alt_text
FROM works w
LEFT JOIN categories c ON c.id = w.category_id
LEFT JOIN work_images cover ON cover.work_id = w.id AND cover.is_cover = 1
WHERE w.publication_status = 'published' AND w.visibility = 'public'
ORDER BY w.is_featured DESC, w.featured_order ASC, w.published_at DESC, w.id DESC
SQL;

$labels = [
    'available' => 'Disponible',
    'sold' => 'Vendida',
    'commission' => 'Obra por encargo',
];

$works = array_map(static function (array $work) use ($labels): array {
    $width = $work['width_cm'] !== null ? rtrim(rtrim((string) $work['width_cm'], '0'), '.') : null;
    $height = $work['height_cm'] !== null ? rtrim(rtrim((string) $work['height_cm'], '0'), '.') : null;
    $description = trim((string) ($work['description'] ?? ''));
    if ($description === 'Título descriptivo provisorio.') {
        $description = '';
    }
    return [
        'id' => (int) $work['id'],
        'title' => $work['title'],
        'slug' => $work['slug'],
        'description' => $description,
        'category' => $work['category'] ?? 'Sin categoría',
        'image' => $work['image'],
        'altText' => $work['alt_text'],
        'medium' => trim((string) ($work['technique'] ?? '')),
        'size' => $width && $height ? sprintf('%s x %s cm', $width, $height) : '',
        'year' => $work['year'] ? (int) $work['year'] : null,
        'status' => $labels[$work['availability_status']] ?? 'Consultar',
    ];
}, db()->query($sql)->fetchAll());

header('Cache-Control: public, max-age=60, stale-while-revalidate=300');
json_response(['works' => $works]);
