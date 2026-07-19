<?php
declare(strict_types=1);

const API_ROOT = __DIR__;
const PROJECT_ROOT = __DIR__ . '/..';

function app_config(): array
{
    static $config;
    if (is_array($config)) {
        return $config;
    }

    $localFile = API_ROOT . '/config.local.php';
    if (is_file($localFile)) {
        $config = require $localFile;
        return $config;
    }

    $serverName = strtolower((string) ($_SERVER['SERVER_NAME'] ?? 'localhost'));
    $isIpAddress = filter_var($serverName, FILTER_VALIDATE_IP) !== false;
    $isPrivateIp = $isIpAddress
        && filter_var(
            $serverName,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        ) === false;
    $isLocal = in_array($serverName, ['localhost', '127.0.0.1', '::1'], true)
        || $isPrivateIp
        || PHP_SAPI === 'cli';

    $config = [
        'db_host' => getenv('GALLERY_DB_HOST') ?: '127.0.0.1',
        'db_port' => getenv('GALLERY_DB_PORT') ?: '3306',
        'db_name' => getenv('GALLERY_DB_NAME') ?: 'galeria_arte',
        'db_user' => getenv('GALLERY_DB_USER') ?: ($isLocal ? 'root' : ''),
        'db_password' => getenv('GALLERY_DB_PASSWORD') ?: '',
        'upload_dir' => PROJECT_ROOT . '/public/uploads/works',
        'upload_url' => getenv('GALLERY_UPLOAD_URL') ?: '/uploads/works',
        'profile_upload_dir' => PROJECT_ROOT . '/public/uploads/profile',
        'profile_upload_url' => getenv('GALLERY_PROFILE_UPLOAD_URL') ?: '/uploads/profile',
        'original_dir' => PROJECT_ROOT . '/storage/originals',
        'max_upload_bytes' => 15 * 1024 * 1024,
        // Wiroos informa la capacidad del plan en GB decimales. Este valor
        // representa el espacio reservado para la galería, no el disco de la PC.
        'storage_capacity_bytes' => (int) (getenv('GALLERY_STORAGE_CAPACITY_BYTES') ?: 10_000_000_000),
    ];

    return $config;
}

function directory_size(string $directory): int
{
    if (!is_dir($directory)) {
        return 0;
    }

    $bytes = 0;
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($iterator as $file) {
        if ($file->isFile() && !$file->isLink()) {
            $bytes += $file->getSize();
        }
    }
    return $bytes;
}

function gallery_storage_usage(): array
{
    $config = app_config();
    $directories = array_unique([
        $config['original_dir'],
        $config['upload_dir'],
        $config['profile_upload_dir'],
    ]);
    $usedBytes = array_sum(array_map('directory_size', $directories));
    $capacityBytes = max(1, (int) ($config['storage_capacity_bytes'] ?? 10_000_000_000));
    $percentage = min(100, round(($usedBytes / $capacityBytes) * 100, 2));

    return [
        'usedBytes' => $usedBytes,
        'capacityBytes' => $capacityBytes,
        'percentage' => $percentage,
        'level' => $percentage >= 90 ? 'critical' : ($percentage >= 80 ? 'warning' : 'normal'),
    ];
}

function settings_defaults(): array
{
    return [
        'artist_name' => 'Nombre de la artista',
        'artist_bio' => 'Texto de presentación a definir con la artista.',
        'artist_location' => 'Mendoza, Argentina',
        'artist_photo' => '',
        'contact_email' => '',
        'recovery_email' => '',
        'instagram_url' => '',
        'facebook_url' => '',
        'whatsapp_url' => '',
    ];
}

function all_settings(): array
{
    $settings = settings_defaults();
    foreach (db()->query('SELECT setting_key, setting_value FROM settings')->fetchAll() as $row) {
        if (array_key_exists($row['setting_key'], $settings)) {
            $settings[$row['setting_key']] = (string) ($row['setting_value'] ?? '');
        }
    }
    return $settings;
}

function db(): PDO
{
    static $pdo;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = app_config();
    if ($config['db_user'] === '') {
        throw new RuntimeException('La conexión MySQL todavía no está configurada.');
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $config['db_host'],
        $config['db_port'],
        $config['db_name']
    );
    $pdo = new PDO($dsn, $config['db_user'], $config['db_password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

function start_secure_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_name('galeria_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function csrf_token(): string
{
    start_secure_session();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(24));
    }
    return $_SESSION['csrf'];
}

function verify_csrf(): void
{
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['_csrf'] ?? '');
    if (!is_string($provided) || !hash_equals(csrf_token(), $provided)) {
        json_response(['error' => 'La sesión venció. Recargá la página e intentá nuevamente.'], 419);
    }
}

function json_input(): array
{
    $content = file_get_contents('php://input');
    if ($content === false || $content === '') {
        return [];
    }
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

function json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    $hasCacheHeader = false;
    foreach (headers_list() as $header) {
        if (stripos($header, 'Cache-Control:') === 0) {
            $hasCacheHeader = true;
            break;
        }
    }
    if (!$hasCacheHeader) {
        header('Cache-Control: no-store');
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function current_user(): ?array
{
    start_secure_session();
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    $statement = db()->prepare('SELECT id, email, display_name FROM users WHERE id = ? AND is_active = 1');
    $statement->execute([(int) $_SESSION['user_id']]);
    $user = $statement->fetch();
    return $user ?: null;
}

function require_admin(): array
{
    $user = current_user();
    if ($user === null) {
        json_response(['error' => 'Necesitás iniciar sesión para continuar.'], 401);
    }
    return $user;
}

function slugify(string $value): string
{
    $value = trim(mb_strtolower($value, 'UTF-8'));
    $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    $value = $ascii !== false ? $ascii : $value;
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
    return trim($value, '-') ?: 'obra';
}

function unique_work_slug(string $title, ?int $ignoreId = null): string
{
    $base = slugify($title);
    $candidate = $base;
    $suffix = 2;
    do {
        $sql = 'SELECT id FROM works WHERE slug = ?' . ($ignoreId ? ' AND id <> ?' : '');
        $statement = db()->prepare($sql);
        $statement->execute($ignoreId ? [$candidate, $ignoreId] : [$candidate]);
        if (!$statement->fetch()) {
            return $candidate;
        }
        $candidate = $base . '-' . $suffix++;
    } while ($suffix < 1000);
    throw new RuntimeException('No se pudo generar una dirección única para la obra.');
}

function delete_stored_image_files(array $image): void
{
    $config = app_config();
    $paths = [];
    if (!empty($image['original_path'])) {
        $paths[] = (string) $image['original_path'];
    }
    foreach (['image_path', 'thumbnail_path'] as $field) {
        $url = (string) ($image[$field] ?? '');
        if ($url !== '' && str_starts_with($url, $config['upload_url'] . '/')) {
            $paths[] = $config['upload_dir'] . '/' . basename($url);
        }
    }
    foreach (array_unique($paths) as $path) {
        if (is_file($path)) {
            @unlink($path);
        }
    }
}

set_exception_handler(static function (Throwable $error): void {
    error_log($error->__toString());
    $message = $error instanceof PDOException
        ? 'No pudimos conectarnos con el catálogo. Revisá la configuración de MySQL.'
        : $error->getMessage();
    json_response(['error' => $message], 500);
});
