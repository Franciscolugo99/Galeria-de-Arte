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

    $defaults = [
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
        'max_image_pixels' => 24_000_000,
        'max_image_side' => 7000,
        'max_upload_files' => 10,
        // Wiroos informa la capacidad del plan en GB decimales. Este valor
        // representa el espacio reservado para la galería, no el disco de la PC.
        'storage_capacity_bytes' => (int) (getenv('GALLERY_STORAGE_CAPACITY_BYTES') ?: 10_000_000_000),
    ];

    $localFile = API_ROOT . '/config.local.php';
    if (is_file($localFile)) {
        $localConfig = require $localFile;
        $config = array_replace($defaults, is_array($localConfig) ? $localConfig : []);
        return $config;
    }

    $config = $defaults;
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

function add_storage_file(array &$files, string $path): void
{
    $path = trim($path);
    if ($path === '' || !is_file($path)) {
        return;
    }

    $realPath = realpath($path);
    if ($realPath === false || is_link($realPath)) {
        return;
    }

    $files[$realPath] = filesize($realPath) ?: 0;
}

function collect_storage_directory_files(array &$files, string $directory): void
{
    if (!is_dir($directory)) {
        return;
    }

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($iterator as $file) {
        if ($file->isFile() && !$file->isLink()) {
            add_storage_file($files, $file->getPathname());
        }
    }
}

function gallery_file_from_public_path(string $path, array $config): ?string
{
    $path = trim($path);
    if ($path === '') {
        return null;
    }

    if (is_file($path)) {
        return $path;
    }

    $urlPath = (string) parse_url($path, PHP_URL_PATH);
    if ($urlPath === '') {
        return null;
    }

    $uploadUrl = rtrim((string) ($config['upload_url'] ?? '/uploads/works'), '/');
    $profileUrl = rtrim((string) ($config['profile_upload_url'] ?? '/uploads/profile'), '/');

    if (str_starts_with($urlPath, $uploadUrl . '/')) {
        return rtrim((string) $config['upload_dir'], '/\\') . '/' . basename($urlPath);
    }
    if (str_starts_with($urlPath, $profileUrl . '/')) {
        return rtrim((string) $config['profile_upload_dir'], '/\\') . '/' . basename($urlPath);
    }

    $candidates = [
        PROJECT_ROOT . $urlPath,
        PROJECT_ROOT . '/public' . $urlPath,
    ];
    foreach ($candidates as $candidate) {
        if (is_file($candidate)) {
            return $candidate;
        }
    }

    return null;
}

function gallery_storage_usage(): array
{
    $config = app_config();
    $files = [];
    $directories = array_unique([
        $config['original_dir'],
        $config['upload_dir'],
        $config['profile_upload_dir'],
    ]);
    foreach ($directories as $directory) {
        collect_storage_directory_files($files, (string) $directory);
    }

    try {
        $imageRows = db()
            ->query('SELECT original_path, image_path, thumbnail_path FROM work_images')
            ->fetchAll();
        foreach ($imageRows as $image) {
            foreach (['original_path', 'image_path', 'thumbnail_path'] as $field) {
                $file = gallery_file_from_public_path((string) ($image[$field] ?? ''), $config);
                if ($file !== null) {
                    add_storage_file($files, $file);
                }
            }
        }

        $profilePhoto = (string) (all_settings()['artist_photo'] ?? '');
        $profileFile = gallery_file_from_public_path($profilePhoto, $config);
        if ($profileFile !== null) {
            add_storage_file($files, $profileFile);
        }
    } catch (Throwable) {
        // Si la base no está disponible, mantenemos el cálculo por carpetas.
    }

    $usedBytes = array_sum($files);
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
        'artist_name' => 'Carina Donaire',
        'artist_bio' => '',
        'artist_location' => 'Mendoza, Argentina',
        'artist_photo' => '',
        'contact_email' => '',
        'notification_email' => '',
        'recovery_email' => '',
        'instagram_url' => '',
        'facebook_url' => '',
        'whatsapp_url' => 'https://wa.me/5492634620883',
    ];
}

function all_settings(): array
{
    $settings = settings_defaults();
    foreach (db()->query('SELECT setting_key, setting_value FROM settings')->fetchAll() as $row) {
        if (array_key_exists($row['setting_key'], $settings)) {
            $value = (string) ($row['setting_value'] ?? '');
            if ($row['setting_key'] === 'whatsapp_url' && trim($value) === '') {
                continue;
            }
            $settings[$row['setting_key']] = $value;
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

    ini_set('session.use_strict_mode', '1');
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

function client_rate_identity(): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'cli');
    $agent = substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 180);
    return hash('sha256', $ip . '|' . $agent);
}

function enforce_rate_limit(string $bucket, int $maxAttempts, int $windowSeconds, string $message): void
{
    if ($maxAttempts < 1 || $windowSeconds < 1) {
        return;
    }

    $directory = PROJECT_ROOT . '/storage/rate-limit';
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
        error_log('No se pudo preparar rate-limit en storage.');
        return;
    }

    $safeBucket = preg_replace('/[^a-z0-9_-]+/i', '-', $bucket) ?: 'general';
    $file = $directory . '/' . $safeBucket . '-' . client_rate_identity() . '.json';
    $now = time();
    $blocked = false;
    $retryAfter = $windowSeconds;
    $handle = fopen($file, 'c+');
    if ($handle === false) {
        error_log('No se pudo abrir rate-limit.');
        return;
    }

    try {
        flock($handle, LOCK_EX);
        $raw = stream_get_contents($handle);
        $stored = is_string($raw) && $raw !== '' ? json_decode($raw, true) : [];
        $timestamps = is_array($stored) ? array_filter(
            array_map('intval', $stored),
            static fn(int $timestamp): bool => $timestamp > $now - $windowSeconds
        ) : [];

        if (count($timestamps) >= $maxAttempts) {
            $blocked = true;
            $oldest = min($timestamps);
            $retryAfter = max(1, ($oldest + $windowSeconds) - $now);
        } else {
            $timestamps[] = $now;
            rewind($handle);
            ftruncate($handle, 0);
            fwrite($handle, json_encode(array_values($timestamps)));
        }
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }

    if ($blocked) {
        header('Retry-After: ' . $retryAfter);
        json_response(['error' => $message], 429);
    }
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
    $debug = getenv('GALLERY_DEBUG') === '1';
    $message = $debug ? $error->getMessage() : ($error instanceof PDOException
        ? 'No pudimos conectarnos con el catálogo. Revisá la configuración de MySQL.'
        : 'No pudimos procesar la solicitud. Intenta nuevamente en unos minutos.');
    json_response(['error' => $message], 500);
});
