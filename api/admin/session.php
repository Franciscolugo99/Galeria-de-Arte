<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $user = current_user();
    $count = (int) db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
    json_response([
        'authenticated' => $user !== null,
        'needsSetup' => $count === 0,
        'user' => $user,
        'csrf' => csrf_token(),
    ]);
}

verify_csrf();

if ($method === 'DELETE') {
    start_secure_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], '', (bool) $params['secure'], true);
    }
    session_destroy();
    json_response(['ok' => true]);
}

if ($method !== 'POST') {
    json_response(['error' => 'Método no permitido.'], 405);
}

$input = json_input();
$action = (string) ($input['action'] ?? 'login');
$email = mb_strtolower(trim((string) ($input['email'] ?? '')), 'UTF-8');
$password = (string) ($input['password'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(['error' => 'Ingresá un correo válido.'], 422);
}
if (strlen($password) < 10) {
    json_response(['error' => 'La contraseña debe tener al menos 10 caracteres.'], 422);
}

if ($action === 'setup') {
    $count = (int) db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
    if ($count !== 0) {
        json_response(['error' => 'El acceso inicial ya fue creado.'], 409);
    }
    $name = trim((string) ($input['displayName'] ?? 'Artista')) ?: 'Artista';
    $statement = db()->prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)');
    $statement->execute([$email, password_hash($password, PASSWORD_DEFAULT), $name]);
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) db()->lastInsertId();
    json_response(['ok' => true, 'message' => 'Tu acceso quedó creado.']);
}

$statement = db()->prepare('SELECT id, password_hash, is_active FROM users WHERE email = ? LIMIT 1');
$statement->execute([$email]);
$user = $statement->fetch();
if (!$user || !(bool) $user['is_active'] || !password_verify($password, $user['password_hash'])) {
    usleep(350000);
    json_response(['error' => 'El correo o la contraseña no coinciden.'], 401);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];
$statement = db()->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?');
$statement->execute([(int) $user['id']]);
json_response(['ok' => true]);

