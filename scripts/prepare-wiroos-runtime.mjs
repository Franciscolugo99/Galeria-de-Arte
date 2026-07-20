import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseRoot = path.join(projectRoot, ".wiroos-release");
const required = ["WIROOS_DB_NAME", "WIROOS_DB_USER", "WIROOS_DB_PASSWORD"];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Falta la variable ${name}.`);
}

const phpString = (value) => `'${String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
const phpInt = (value, fallback) => Number.parseInt(value || "", 10) || fallback;
const config = `<?php
declare(strict_types=1);

return [
    'db_host' => 'localhost',
    'db_port' => '3306',
    'db_name' => ${phpString(process.env.WIROOS_DB_NAME)},
    'db_user' => ${phpString(process.env.WIROOS_DB_USER)},
    'db_password' => ${phpString(process.env.WIROOS_DB_PASSWORD)},
    'upload_dir' => dirname(__DIR__) . '/uploads/works',
    'upload_url' => '/uploads/works',
    'profile_upload_dir' => dirname(__DIR__) . '/uploads/profile',
    'profile_upload_url' => '/uploads/profile',
    'original_dir' => dirname(__DIR__) . '/storage/originals',
    'max_upload_bytes' => 15 * 1024 * 1024,
    'storage_capacity_bytes' => 10_000_000_000,
    'smtp_host' => ${phpString(process.env.WIROOS_SMTP_HOST || '')},
    'smtp_port' => ${phpInt(process.env.WIROOS_SMTP_PORT, 465)},
    'smtp_username' => ${phpString(process.env.WIROOS_SMTP_USERNAME || '')},
    'smtp_password' => ${phpString(process.env.WIROOS_SMTP_PASSWORD || '')},
    'smtp_secure' => ${phpString(process.env.WIROOS_SMTP_SECURE || 'ssl')},
    'smtp_from' => ${phpString(process.env.WIROOS_SMTP_FROM || process.env.WIROOS_SMTP_USERNAME || '')},
    'smtp_from_name' => ${phpString(process.env.WIROOS_SMTP_FROM_NAME || 'Carina Donaire')},
    'contact_recipient' => ${phpString(process.env.WIROOS_CONTACT_RECIPIENT || process.env.WIROOS_SMTP_USERNAME || '')},
];
`;
await writeFile(path.join(releaseRoot, "api", "config.local.php"), config, "utf8");

const schema = await readFile(path.join(projectRoot, "database", "schema.sql"), "utf8");
const seed = await readFile(path.join(projectRoot, "database", "seed.sql"), "utf8");
const sqlPayload = Buffer.from(`${schema}\n${seed}`, "utf8").toString("base64");
const token = randomBytes(24).toString("hex");
const installer = `<?php
declare(strict_types=1);
require __DIR__ . '/api/bootstrap.php';

$provided = (string) ($_GET['token'] ?? '');
if (!hash_equals(${phpString(token)}, $provided)) {
    http_response_code(404);
    exit;
}

$sql = base64_decode(${phpString(sqlPayload)}, true);
if ($sql === false) {
    throw new RuntimeException('No se pudo leer la instalación.');
}

$statements = preg_split('/;\\s*(?:\\r?\\n|$)/', $sql) ?: [];
foreach ($statements as $statement) {
    $statement = trim($statement);
    if ($statement !== '') db()->exec($statement);
}

$tables = (int) db()->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('users','categories','works','work_images','settings')")->fetchColumn();
json_response(['ok' => $tables === 5, 'tables' => $tables]);
`;
await writeFile(path.join(releaseRoot, "_install.php"), installer, "utf8");
await writeFile(path.join(releaseRoot, ".install-token"), token, "utf8");
