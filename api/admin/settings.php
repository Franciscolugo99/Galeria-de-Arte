<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
require_admin();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
    json_response(['settings' => all_settings()]);
}
if ($method !== 'PUT') {
    json_response(['error' => 'Método no permitido.'], 405);
}

verify_csrf();
$input = json_input();
$allowed = ['artist_name', 'artist_bio', 'artist_location', 'contact_email', 'recovery_email', 'instagram_url', 'facebook_url', 'whatsapp_url'];
$values = [];
foreach ($allowed as $key) {
    $values[$key] = trim((string) ($input[$key] ?? ''));
}

if (mb_strlen($values['artist_name']) < 2 || mb_strlen($values['artist_name']) > 120) {
    json_response(['error' => 'Revisá el nombre de la artista.'], 422);
}
if (mb_strlen($values['artist_bio']) > 3000) {
    json_response(['error' => 'La presentación es demasiado extensa.'], 422);
}
foreach (['contact_email', 'recovery_email'] as $emailKey) {
    if ($values[$emailKey] !== '' && !filter_var($values[$emailKey], FILTER_VALIDATE_EMAIL)) {
        json_response(['error' => 'Revisá los correos ingresados.'], 422);
    }
}
foreach (['instagram_url', 'facebook_url', 'whatsapp_url'] as $urlKey) {
    if ($values[$urlKey] !== '' && (!filter_var($values[$urlKey], FILTER_VALIDATE_URL) || !preg_match('#^https?://#i', $values[$urlKey]))) {
        json_response(['error' => 'Las redes deben incluir la dirección completa, por ejemplo https://…'], 422);
    }
}

$statement = db()->prepare('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)');
db()->beginTransaction();
foreach ($values as $key => $value) {
    $statement->execute([$key, $value]);
}
db()->commit();
json_response(['ok' => true, 'message' => 'Datos de la artista actualizados.', 'settings' => all_settings()]);
