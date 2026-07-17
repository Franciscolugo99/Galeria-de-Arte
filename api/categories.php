<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

$rows = db()->query('SELECT id, name, slug FROM categories WHERE is_active = 1 ORDER BY sort_order, name')->fetchAll();
json_response(['categories' => array_map(static fn(array $row): array => [
    'id' => (int) $row['id'],
    'name' => $row['name'],
    'slug' => $row['slug'],
], $rows)]);

