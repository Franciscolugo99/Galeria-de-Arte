<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

json_response([
    'error' => 'El formulario por correo no esta activo. Por ahora las consultas se envian por WhatsApp.',
], 410);
