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
    'max_image_pixels' => 24_000_000,
    'max_image_side' => 7000,
    'max_upload_files' => 10,
    // Capacidad contratada. El plan de 10 GB equivale a 10.000.000.000 bytes.
    'storage_capacity_bytes' => 10_000_000_000,
    'smtp_host' => '',
    'smtp_port' => 465,
    'smtp_username' => '',
    'smtp_password' => '',
    'smtp_secure' => 'ssl',
    'smtp_from' => '',
    'smtp_from_name' => 'Carina Donaire',
    'contact_recipient' => '',
];
