<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_response(['error' => 'Método no permitido.'], 405);
}

header('Cache-Control: public, max-age=60, stale-while-revalidate=300');
$settings = all_settings();
unset($settings['recovery_email']);
unset($settings['notification_email']);
json_response(['settings' => $settings]);
