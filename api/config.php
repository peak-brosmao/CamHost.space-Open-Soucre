<?php
// =============================================
// CamHost.space — API Configuration
// Developer: PEAK BROSMAO · peakbrosmao.me
// =============================================

// ── Telegram Bot Settings ──
// Get your token from @BotFather on Telegram
// Get your Chat ID by forwarding a message to @userinfobot
define('TELEGRAM_BOT_TOKEN', '8984355230:AAHtZHcEl2mkOlnpguj8gVz3mQe2uHRC2-I');
define('TELEGRAM_CHAT_ID',   '8281769034');

// ── Telegram API Mode ──────────────────────────────────────────────────────
//
//  MODE A — Telegram Cloud API (default, no extra setup)
//    - Works out of the box
//    - Max file size: 50 MB
//
//  MODE B — Telegram Local Bot API Server (self-hosted, unlocks 2 GB)
//    - Max file size: 2 GB
//    - Requires running: https://github.com/tdlib/telegram-bot-api
//    - Default local server URL: http://127.0.0.1:8081
//
// Set TELEGRAM_LOCAL_MODE to true and fill TELEGRAM_LOCAL_URL to enable MODE B.
// ────────────────────────────────────────────────────────────────────────────
define('TELEGRAM_LOCAL_MODE', false);                         // true = Local API (2 GB), false = Cloud API (50 MB)
define('TELEGRAM_LOCAL_URL',  'http://127.0.0.1:8081');       // URL of your local Bot API server

// Computed API base URL (don't change this)
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
// Generate a strong random secret: php -r "echo bin2hex(random_bytes(32));"
define('JWT_SECRET',     'CHANGE_THIS_TO_A_RANDOM_SECRET_KEY_AT_LEAST_32_CHARS');

// ── Admin Credentials (single-user mode) ──
// Change these before deploying!
define('ADMIN_EMAIL',    'admin@camhost.space');
define('ADMIN_PASSWORD', 'changeme123');  // Plain text — will be hashed on first boot

// ── Database ──
define('DB_PATH', __DIR__ . '/../data/camhost.db');

// ── Upload Limit ──
// Cloud mode  → keep at 50 (Telegram hard limit)
// Local mode  → set up to 2000 (2 GB)
define('UPLOAD_MAX_MB', TELEGRAM_LOCAL_MODE ? 2000 : 50);

// ── cURL Timeouts ──
// Local mode needs longer timeouts for large file transfers
define('CURL_UPLOAD_TIMEOUT',  TELEGRAM_LOCAL_MODE ? 3600 : 120);  // seconds
define('CURL_CONNECT_TIMEOUT', 30);

// ── App ──
define('APP_NAME',    'CamHost.space');
define('APP_VERSION', '1.0.0');
define('APP_URL',     'https://api.camhost.space'); // API subdomain

// ── CORS — allowed origins ──
// Only allow requests from the official frontend domain.
// Change to '*' only for local development.
define('CORS_ORIGIN', 'https://camhost.space');
