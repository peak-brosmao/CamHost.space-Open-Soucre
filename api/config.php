<?php
// =============================================
// CamHost.space — Secure API Configuration
// Developer: PEAK BROSMAO · peakbrosmao.me
// =============================================

// ── Lightweight Zero-Dependency .env Loader ─────────────────────────
function loadEnvFile(string $path): void {
    if (!file_exists($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (str_contains($line, '=')) {
            [$k, $v] = explode('=', $line, 2);
            $k = trim($k);
            $v = trim($v);
            if ((str_starts_with($v, '"') && str_ends_with($v, '"')) ||
                (str_starts_with($v, "'") && str_ends_with($v, "'"))) {
                $v = substr($v, 1, -1);
            }
            if (!array_key_exists($k, $_SERVER) && !array_key_exists($k, $_ENV)) {
                putenv("$k=$v");
                $_ENV[$k]    = $v;
                $_SERVER[$k] = $v;
            }
        }
    }
}

// Load .env from api/ directory or root directory
loadEnvFile(__DIR__ . '/.env');
loadEnvFile(__DIR__ . '/../.env');

function env(string $key, mixed $default = null): mixed {
    $val = getenv($key);
    if ($val === false) {
        $val = $_ENV[$key] ?? $_SERVER[$key] ?? $default;
    }
    if ($val === 'true' || $val === '(true)') return true;
    if ($val === 'false' || $val === '(false)') return false;
    if ($val === 'empty' || $val === '(empty)') return '';
    if ($val === 'null' || $val === '(null)') return null;
    return $val;
}

// ── Telegram Bot Settings ──
define('TELEGRAM_BOT_TOKEN', env('TELEGRAM_BOT_TOKEN', ''));
define('TELEGRAM_CHAT_ID',   env('TELEGRAM_CHAT_ID',   ''));

// ── Telegram API Mode ───────────────────────────────────────────────
define('TELEGRAM_LOCAL_MODE', env('TELEGRAM_LOCAL_MODE', false));
define('TELEGRAM_LOCAL_URL',  env('TELEGRAM_LOCAL_URL',  'http://127.0.0.1:8081'));

// Computed API base URL
define('TELEGRAM_API_BASE',
    TELEGRAM_LOCAL_MODE
        ? rtrim(TELEGRAM_LOCAL_URL, '/') . '/bot' . TELEGRAM_BOT_TOKEN
        : 'https://api.telegram.org/bot'     . TELEGRAM_BOT_TOKEN
);

// Computed file download base URL
define('TELEGRAM_FILE_BASE',
    TELEGRAM_LOCAL_MODE
        ? rtrim(TELEGRAM_LOCAL_URL, '/') . '/file/bot' . TELEGRAM_BOT_TOKEN
        : 'https://api.telegram.org/file/bot'          . TELEGRAM_BOT_TOKEN
);

// ── Security ──
define('JWT_SECRET', env('JWT_SECRET', 'CHANGE_THIS_TO_A_RANDOM_SECRET_KEY_AT_LEAST_32_CHARS'));

// ── Admin Credentials ──
define('ADMIN_EMAIL',    env('ADMIN_EMAIL',    'admin@camhost.space'));
define('ADMIN_PASSWORD', env('ADMIN_PASSWORD', 'changeme123'));

// ── Database ──
define('DB_PATH', env('DB_PATH', __DIR__ . '/../data/camhost.db'));

// ── Upload Limit ──
define('UPLOAD_MAX_MB', (int)env('UPLOAD_MAX_MB', 2000));

// ── cURL Timeouts ──
define('CURL_UPLOAD_TIMEOUT',  (int)env('CURL_UPLOAD_TIMEOUT', 3600));
define('CURL_CONNECT_TIMEOUT', 30);

// ── App Info ──
define('APP_NAME',    'CamHost.space');
define('APP_VERSION', '1.0.0');
define('APP_URL',     env('APP_URL', 'https://api.camhost.space'));

// ── Strict CORS & Domain Protection ──
// Strictly allowed frontend origins. Multiple domains can be comma-separated.
define('ALLOWED_ORIGINS', env('ALLOWED_ORIGINS', 'https://camhost.space,http://localhost:3000,http://localhost:5173'));

// ── Hostinger SMTP Settings ──
define('SMTP_HOST',      env('SMTP_HOST', 'smtp.hostinger.com'));
define('SMTP_PORT',      (int)env('SMTP_PORT', 465));
define('SMTP_SECURE',    env('SMTP_SECURE', 'ssl'));
define('SMTP_USER',      env('SMTP_USER', 'noreply@camhost.space'));
define('SMTP_PASS',      env('SMTP_PASS', ''));
define('SMTP_FROM',      env('SMTP_FROM', 'noreply@camhost.space'));
define('SMTP_FROM_NAME', env('SMTP_FROM_NAME', 'CamHost.space'));
define('SMTP_REPLY_TO',  env('SMTP_REPLY_TO', 'support@camhost.space'));
define('FRONTEND_URL',   env('FRONTEND_URL', 'https://camhost.space'));

// ── Global Helper Utilities ──────────────────────────────────────
if (!function_exists('formatBytes')) {
    function formatBytes(int $bytes): string {
        if ($bytes >= 1073741824) return round($bytes / 1073741824, 2) . ' GB';
        if ($bytes >= 1048576)    return round($bytes / 1048576,    2) . ' MB';
        if ($bytes >= 1024)       return round($bytes / 1024,       2) . ' KB';
        return $bytes . ' B';
    }
}
