<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_response(['error' => 'Método no permitido.'], 405);
}

$input = json_input();
if (trim((string) ($input['website'] ?? '')) !== '') {
    json_response(['ok' => true, 'message' => 'Gracias. Recibimos tu consulta.']);
}

$name = trim((string) ($input['name'] ?? ''));
$email = mb_strtolower(trim((string) ($input['email'] ?? '')), 'UTF-8');
$interest = trim((string) ($input['interest'] ?? 'Consulta desde la web'));
$message = trim((string) ($input['message'] ?? ''));

if (mb_strlen($name) < 2 || mb_strlen($name) > 120) {
    json_response(['error' => 'Ingresá tu nombre.'], 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
    json_response(['error' => 'Ingresá un correo válido.'], 422);
}
if (mb_strlen($interest) > 120) {
    json_response(['error' => 'Revisá el motivo de consulta.'], 422);
}
if (mb_strlen($message) < 10 || mb_strlen($message) > 3000) {
    json_response(['error' => 'El mensaje debe tener entre 10 y 3000 caracteres.'], 422);
}

$settings = all_settings();
$config = app_config();
$recipient = trim((string) (
    $settings['notification_email']
    ?: ($config['contact_recipient'] ?? '')
    ?: ($settings['contact_email'] ?? '')
    ?: ($config['smtp_username'] ?? '')
));

if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
    json_response(['error' => 'El correo de recepción todavía no está configurado.'], 500);
}

$siteName = trim((string) ($settings['artist_name'] ?? 'Carina Donaire')) ?: 'Carina Donaire';
$subject = 'Nueva consulta desde carinadonaire.com.ar';
$body = implode("\n", [
    'Nueva consulta desde el sitio web.',
    '',
    'Nombre: ' . $name,
    'Correo: ' . $email,
    'Interés: ' . ($interest !== '' ? $interest : 'Sin especificar'),
    '',
    'Mensaje:',
    $message,
    '',
    'Fecha: ' . date('Y-m-d H:i:s'),
    'IP: ' . ($_SERVER['REMOTE_ADDR'] ?? 'No disponible'),
]);

$confirmationSubject = 'Recibimos tu consulta';
$confirmationBody = implode("\n", [
    'Hola ' . $name . ',',
    '',
    'Gracias por escribir a ' . $siteName . '. Recibimos tu consulta y te vamos a responder por este mismo correo.',
    '',
    'Tu mensaje:',
    $message,
    '',
    $siteName,
]);

send_contact_email($recipient, $subject, $body, $email, $name);
send_contact_email($email, $confirmationSubject, $confirmationBody, $recipient, $siteName);

json_response(['ok' => true, 'message' => 'Gracias. Recibimos tu consulta y te vamos a responder por correo.']);

function send_contact_email(string $to, string $subject, string $body, string $replyTo, string $replyName): void
{
    $config = app_config();
    $from = trim((string) ($config['smtp_from'] ?? '')) ?: trim((string) ($config['smtp_username'] ?? ''));
    if (!filter_var($from, FILTER_VALIDATE_EMAIL)) {
        $from = trim((string) ($config['contact_recipient'] ?? ''));
    }
    if (!filter_var($from, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('El remitente de correo no está configurado.');
    }

    $fromName = trim((string) ($config['smtp_from_name'] ?? 'Carina Donaire')) ?: 'Carina Donaire';
    $headers = [
        'From' => format_mailbox($from, $fromName),
        'Reply-To' => format_mailbox($replyTo, $replyName),
        'MIME-Version' => '1.0',
        'Content-Type' => 'text/plain; charset=UTF-8',
        'Content-Transfer-Encoding' => '8bit',
        'X-Mailer' => 'Carina Donaire Web',
    ];

    $host = trim((string) ($config['smtp_host'] ?? ''));
    $username = trim((string) ($config['smtp_username'] ?? ''));
    $password = (string) ($config['smtp_password'] ?? '');
    if ($host !== '' && $username !== '' && $password !== '') {
        smtp_send($to, $subject, $body, $headers, $from);
        return;
    }

    $headerLines = [];
    foreach ($headers as $key => $value) {
        $headerLines[] = $key . ': ' . $value;
    }
    if (!mail($to, encode_header($subject), normalize_body($body), implode("\r\n", $headerLines))) {
        throw new RuntimeException('No se pudo enviar el correo.');
    }
}

function smtp_send(string $to, string $subject, string $body, array $headers, string $from): void
{
    $config = app_config();
    $host = trim((string) $config['smtp_host']);
    $port = (int) ($config['smtp_port'] ?? 465);
    $secure = strtolower(trim((string) ($config['smtp_secure'] ?? 'ssl')));
    $remote = ($secure === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;
    $errno = 0;
    $errstr = '';
    $socket = stream_socket_client($remote, $errno, $errstr, 20, STREAM_CLIENT_CONNECT);
    if (!is_resource($socket)) {
        throw new RuntimeException('No se pudo conectar con el servidor SMTP.');
    }

    stream_set_timeout($socket, 20);
    try {
        smtp_expect($socket, [220]);
        smtp_command($socket, 'EHLO carinadonaire.com.ar', [250]);
        if ($secure === 'tls') {
            smtp_command($socket, 'STARTTLS', [220]);
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('No se pudo iniciar TLS con SMTP.');
            }
            smtp_command($socket, 'EHLO carinadonaire.com.ar', [250]);
        }
        smtp_command($socket, 'AUTH LOGIN', [334]);
        smtp_command($socket, base64_encode((string) $config['smtp_username']), [334]);
        smtp_command($socket, base64_encode((string) $config['smtp_password']), [235]);
        smtp_command($socket, 'MAIL FROM:<' . clean_email($from) . '>', [250]);
        smtp_command($socket, 'RCPT TO:<' . clean_email($to) . '>', [250, 251]);
        smtp_command($socket, 'DATA', [354]);

        $headerLines = ['To: ' . format_mailbox($to, '')];
        $headerLines[] = 'Subject: ' . encode_header($subject);
        foreach ($headers as $key => $value) {
            $headerLines[] = $key . ': ' . $value;
        }
        fwrite($socket, implode("\r\n", $headerLines) . "\r\n\r\n" . escape_smtp_body($body) . "\r\n.\r\n");
        smtp_expect($socket, [250]);
        smtp_command($socket, 'QUIT', [221]);
    } finally {
        fclose($socket);
    }
}

function smtp_command($socket, string $command, array $expected): string
{
    fwrite($socket, $command . "\r\n");
    return smtp_expect($socket, $expected);
}

function smtp_expect($socket, array $expected): string
{
    $response = '';
    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;
        if (preg_match('/^(\d{3})(\s|-)/', $line, $match) && $match[2] === ' ') {
            $code = (int) $match[1];
            if (!in_array($code, $expected, true)) {
                throw new RuntimeException('El servidor SMTP rechazó el envío.');
            }
            return $response;
        }
    }
    throw new RuntimeException('El servidor SMTP no respondió.');
}

function format_mailbox(string $email, string $name): string
{
    $email = clean_email($email);
    $name = trim(str_replace(["\r", "\n"], ' ', $name));
    return $name !== '' ? encode_header($name) . ' <' . $email . '>' : '<' . $email . '>';
}

function encode_header(string $value): string
{
    $value = trim(str_replace(["\r", "\n"], ' ', $value));
    return preg_match('/[^\x20-\x7E]/', $value)
        ? '=?UTF-8?B?' . base64_encode($value) . '?='
        : $value;
}

function clean_email(string $email): string
{
    return str_replace(["\r", "\n", '<', '>'], '', trim($email));
}

function normalize_body(string $body): string
{
    return str_replace(["\r\n", "\r"], "\n", $body);
}

function escape_smtp_body(string $body): string
{
    $body = normalize_body($body);
    $body = preg_replace('/^\./m', '..', $body) ?? $body;
    return str_replace("\n", "\r\n", $body);
}
