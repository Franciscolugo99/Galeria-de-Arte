<?php
declare(strict_types=1);

return [
    'db_host' => '127.0.0.1',
    'db_port' => '3306',
    'db_name' => 'galeria_arte',
    'db_user' => 'galeria_user',
    'db_password' => 'cambiar_en_wiroos',
    'upload_dir' => dirname(__DIR__) . '/public/uploads/works',
    'upload_url' => '/uploads/works',
    'profile_upload_dir' => dirname(__DIR__) . '/public/uploads/profile',
    'profile_upload_url' => '/uploads/profile',
    'original_dir' => dirname(__DIR__) . '/storage/originals',
    'max_upload_bytes' => 15 * 1024 * 1024,
];
