<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
require_admin();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function category_rows(): array
{
    $sql = <<<'SQL'
SELECT c.id, c.name, c.slug, c.sort_order, c.is_active, COUNT(w.id) AS work_count
FROM categories c
LEFT JOIN works w ON w.category_id = c.id
GROUP BY c.id
ORDER BY c.sort_order, c.name
SQL;
    return array_map(static fn(array $row): array => [
        'id' => (int) $row['id'],
        'name' => $row['name'],
        'slug' => $row['slug'],
        'sortOrder' => (int) $row['sort_order'],
        'isActive' => (bool) $row['is_active'],
        'workCount' => (int) $row['work_count'],
    ], db()->query($sql)->fetchAll());
}

if ($method === 'GET') {
    json_response(['categories' => category_rows()]);
}

verify_csrf();
$input = json_input();

if ($method === 'DELETE') {
    $id = (int) ($input['id'] ?? 0);
    $statement = db()->prepare('SELECT COUNT(*) FROM works WHERE category_id = ?');
    $statement->execute([$id]);
    if ((int) $statement->fetchColumn() > 0) {
        json_response(['error' => 'Esta categoría tiene obras. Cambialas de categoría antes de eliminarla.'], 409);
    }
    db()->prepare('DELETE FROM categories WHERE id = ?')->execute([$id]);
    json_response(['ok' => true, 'message' => 'Categoría eliminada.']);
}

if (!in_array($method, ['POST', 'PUT'], true)) {
    json_response(['error' => 'Método no permitido.'], 405);
}

$id = isset($input['id']) ? (int) $input['id'] : null;
$name = trim((string) ($input['name'] ?? ''));
$sortOrder = max(0, (int) ($input['sortOrder'] ?? 0));
if (mb_strlen($name) < 2 || mb_strlen($name) > 80) {
    json_response(['error' => 'El nombre debe tener entre 2 y 80 caracteres.'], 422);
}

$slugBase = slugify($name);
$slug = $slugBase;
$suffix = 2;
do {
    $sql = 'SELECT id FROM categories WHERE slug = ?' . ($id ? ' AND id <> ?' : '');
    $statement = db()->prepare($sql);
    $statement->execute($id ? [$slug, $id] : [$slug]);
    $exists = $statement->fetch();
    if ($exists) {
        $slug = $slugBase . '-' . $suffix++;
    }
} while ($exists && $suffix < 1000);

if ($id) {
    $statement = db()->prepare('UPDATE categories SET name = ?, slug = ?, sort_order = ? WHERE id = ?');
    $statement->execute([$name, $slug, $sortOrder, $id]);
} else {
    $statement = db()->prepare('INSERT INTO categories (name, slug, sort_order) VALUES (?, ?, ?)');
    $statement->execute([$name, $slug, $sortOrder]);
    $id = (int) db()->lastInsertId();
}

json_response(['ok' => true, 'id' => $id, 'message' => 'Categoría guardada.', 'categories' => category_rows()]);

