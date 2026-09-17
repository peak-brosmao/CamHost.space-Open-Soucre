<?php
// =============================================
// CamHost.space — File Upload Handler
// Developer: PEAK BROSMAO · peakbrosmao.me
// =============================================
// Receives multipart file upload, streams to Telegram Bot API,
// saves metadata to SQLite.

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

/**
 * POST /api/upload
 * Multipart form-data: file (required), description (optional)
 * Returns: { success: true, file: {...} }
 */
function handleUpload(): void {
    @set_time_limit(3600);
    @ini_set('max_execution_time', '3600');
    @ini_set('memory_limit', '512M');

    $user = requireVerified();

    // ── Upload Rate Limit (Anti-abuse) ──────────────────────────
    enforceRateLimit('upload', 20, 60);

    // ── Validate uploaded file ──────────────────────────────────
    if (empty($_FILES['file'])) {
        jsonError('No file uploaded. Use field name "file".', 400);
    }

    $f = $_FILES['file'];

    if ($f['error'] !== UPLOAD_ERR_OK) {
        $errors = [
            UPLOAD_ERR_INI_SIZE   => 'File exceeds server upload limit (upload_max_filesize)',
            UPLOAD_ERR_FORM_SIZE  => 'File exceeds form MAX_FILE_SIZE',
            UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded',
            UPLOAD_ERR_NO_FILE    => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Server temp directory missing',
            UPLOAD_ERR_CANT_WRITE => 'Server failed to write file',
            UPLOAD_ERR_EXTENSION  => 'Upload blocked by PHP extension',
        ];
        jsonError($errors[$f['error']] ?? 'Upload error code ' . $f['error'], 400);
    }

    // Size check
    $maxBytes = UPLOAD_MAX_MB * 1024 * 1024;
    if ($f['size'] > $maxBytes) {
        $humanSize = formatBytes($f['size']);
        $helpNote = TELEGRAM_LOCAL_MODE
            ? "Max allowed: " . UPLOAD_MAX_MB . " MB."
            : "Telegram Cloud Bot API limits uploads to " . UPLOAD_MAX_MB . " MB. To upload larger files (up to 2 GB), set TELEGRAM_LOCAL_MODE=true in api/.env with a local Telegram Bot API server.";
        jsonError("File too large ({$humanSize}). {$helpNote}", 413);
    }

    $originalName = basename($f['name']);

    // Block dangerous server-executable scripts (prevent server-side web shells)
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $dangerousExts = ['php', 'php3', 'php4', 'php5', 'phtml', 'phar', 'htaccess', 'htpasswd'];
    if (in_array($ext, $dangerousExts, true)) {
        jsonError('Security restriction: Server scripts (.php, .htaccess) cannot be uploaded.', 400);
    }
    $mimeType     = mime_content_type($f['tmp_name']) ?: 'application/octet-stream';
    $sizeBytes    = $f['size'];
    $description  = trim($_POST['description'] ?? '');
    $tmpPath      = $f['tmp_name'];

    // ── Check Telegram bot configuration ─────────────────────────
    if (empty(TELEGRAM_BOT_TOKEN)) {
        jsonError('Telegram Bot Token is not configured. Please set TELEGRAM_BOT_TOKEN in your server api/.env file.', 500);
    }
    if (empty(TELEGRAM_CHAT_ID)) {
        jsonError('Telegram Chat ID is not configured. Please set TELEGRAM_CHAT_ID in your server api/.env file.', 500);
    }

    // ── Send to Telegram (Single File Only) ─────────────────────
    $result = sendToTelegram($tmpPath, $originalName, $mimeType, $description);

    if (!$result['ok']) {
        $desc = $result['description'] ?? 'Unknown error';
        if (str_contains(strtolower($desc), 'unauthorized')) {
            jsonError('Telegram Bot Token is invalid or unauthorized (401). Please check that TELEGRAM_BOT_TOKEN in your server api/.env matches the token provided by @BotFather.', 502);
        }
        if (str_contains(strtolower($desc), 'chat not found') || str_contains(strtolower($desc), 'chat_write_forbidden')) {
            jsonError('Telegram Channel error: ' . $desc . '. Please make sure your bot is added as an Administrator to your channel with Post permissions.', 502);
        }
        if (str_contains(strtolower($desc), 'file is too big') || str_contains(strtolower($desc), 'request entity too large')) {
            jsonError('Telegram Bot API rejected file: Telegram Cloud Bot API allows up to 50 MB per file. To upload files up to 2 GB as a single file, run a local Telegram Bot API server and set TELEGRAM_LOCAL_MODE=true.', 413);
        }
        jsonError('Telegram upload failed: ' . $desc, 502);
    }

    $msg        = $result['result'];
    $messageId  = $msg['message_id'];
    $fileId     = extractFileId($msg);

    if (!$fileId) {
        jsonError('Telegram returned no file_id. Check bot permissions.', 502);
    }

    $folderId = !empty($_POST['folder_id']) ? (int)$_POST['folder_id'] : null;
    if ($folderId !== null) {
        try {
            $chk = db()->prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?');
            $chk->execute([$folderId, $user['id']]);
            if (!$chk->fetchColumn()) {
                $folderId = null; // Gracefully fallback to root if folder belongs to another user or doesn't exist
            }
        } catch (Exception $e) {
            $folderId = null;
        }
    }

    // ── Generate Instant Share Token & Save metadata to SQLite ──
    $shareToken = bin2hex(random_bytes(16));
    $inserted = false;
    $attempts = 0;
    $lastErr = null;

    $newId = null;
    while ($attempts < 15 && !$inserted) {
        $attempts++;
        try {
            $pdo = db();
            $stmt = $pdo->prepare('
                INSERT INTO files (user_id, folder_id, original_name, mime_type, size_bytes, telegram_file_id, message_id, description, is_public, share_token)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            ');
            $stmt->execute([
                $user['id'],
                $folderId,
                $originalName,
                $mimeType,
                $sizeBytes,
                $fileId,
                $messageId,
                $description ?: null,
                $shareToken,
            ]);
            $newId = (int)$pdo->lastInsertId();
            $inserted = true;
        } catch (PDOException $e) {
            $lastErr = $e;
            if (str_contains(strtolower($e->getMessage()), 'locked') && $attempts < 15) {
                db(true); // Close and refresh the PDO connection handle to clear any stuck lock
                usleep(200000 * $attempts); // Progressive backoff (200ms, 400ms, 600ms...)
                continue;
            }
            break;
        } catch (Throwable $e) {
            $lastErr = $e;
            break;
        }
    }

    if (!$inserted && $lastErr) {
        error_log('[CamHost Upload Save Error] ' . $lastErr->getMessage());
        jsonError('Failed to save file metadata: ' . $lastErr->getMessage(), 500);
    }

    if (!$newId) {
        $newId = (int)db()->lastInsertId();
    }
    $shareUrl = FRONTEND_URL . '/share/' . $shareToken;

    jsonSuccess([
        'file' => [
            'id'            => (int)$newId,
            'folder_id'     => $folderId,
            'name'          => $originalName,
            'file_name'     => $originalName,
            'original_name' => $originalName,
            'mime'          => $mimeType,
            'mime_type'     => $mimeType,
            'size'          => $sizeBytes,
            'file_size'     => $sizeBytes,
            'size_bytes'    => $sizeBytes,
            'size_human'    => formatBytes($sizeBytes),
            'downloads'     => 0,
            'is_public'     => 1,
            'share_token'   => $shareToken,
            'share_url'     => $shareUrl,
            'description'   => $description ?: null,
            'created_at'    => date('c'),
        ],
        'share_url'   => $shareUrl,
        'share_token' => $shareToken,
        'message'     => 'File uploaded successfully',
        'mode'        => TELEGRAM_LOCAL_MODE ? 'local-api (2 GB)' : 'cloud-api (50 MB)',
    ], 201);
}

// ── Telegram Helpers ────────────────────────────────────────────

/**
 * Upload a file to the configured Telegram chat via sendDocument.
 */
function sendToTelegram(string $path, string $name, string $mime, string $caption = ''): array {
    $url  = TELEGRAM_API_BASE . '/sendDocument';
    $data = [
        'chat_id'              => TELEGRAM_CHAT_ID,
        'disable_notification' => 'true',
        'document'             => new CURLFile($path, $mime, $name),
    ];

    // Only set caption if an explicit description was provided, safely escaped
    if (!empty($caption)) {
        $data['caption']    = htmlspecialchars($caption, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $data['parse_mode'] = 'HTML';
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $data,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => CURL_UPLOAD_TIMEOUT,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,    // Force IPv4 immediately to avoid 3-5s IPv6 DNS delay
        CURLOPT_TCP_NODELAY    => 1,                    // Disable Nagle's algorithm for instant streaming
        CURLOPT_TCP_KEEPALIVE  => 1,
        CURLOPT_BUFFERSIZE     => 524288,               // 512 KB high-throughput memory buffer
        CURLOPT_ENCODING       => '',                   // Fast gzip/deflate decoding from Telegram
        CURLOPT_NOPROGRESS     => true,
    ]);

    $response = curl_exec($ch);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        return ['ok' => false, 'description' => 'cURL error: ' . $curlErr];
    }

    $json = json_decode($response, true);
    return $json ?: ['ok' => false, 'description' => 'Invalid JSON from Telegram'];
}

/**
 * Extract the Telegram file_id from any message type.
 * Telegram returns different keys depending on file type:
 * - WebP files are often categorized as 'sticker' or 'animation'
 * - Standard files are under 'document'
 * - Media under 'photo', 'video', 'audio', etc.
 */
function extractFileId(array $msg): ?string {
    // 1. Direct standard keys
    if (!empty($msg['document']['file_id']))    return $msg['document']['file_id'];
    if (!empty($msg['sticker']['file_id']))     return $msg['sticker']['file_id'];   // WebP / Stickers
    if (!empty($msg['animation']['file_id']))   return $msg['animation']['file_id']; // WebP/GIF animations
    if (!empty($msg['video']['file_id']))       return $msg['video']['file_id'];
    if (!empty($msg['audio']['file_id']))       return $msg['audio']['file_id'];
    if (!empty($msg['voice']['file_id']))       return $msg['voice']['file_id'];
    if (!empty($msg['video_note']['file_id']))  return $msg['video_note']['file_id'];

    // 2. Photos — use the largest size
    if (!empty($msg['photo']) && is_array($msg['photo'])) {
        $largest = end($msg['photo']);
        if (!empty($largest['file_id'])) return $largest['file_id'];
    }

    // 3. Universal recursive search: locate ANY 'file_id' in the response
    $finder = function($node) use (&$finder) {
        if (!is_array($node)) return null;
        if (!empty($node['file_id']) && is_string($node['file_id'])) {
            return $node['file_id'];
        }
        foreach ($node as $child) {
            if (is_array($child)) {
                $res = $finder($child);
                if ($res) return $res;
            }
        }
        return null;
    };

    return $finder($msg);
}

// ── Utility ─────────────────────────────────────────────────────

if (!function_exists('formatBytes')) {
    function formatBytes(int $bytes): string {
        if ($bytes >= 1073741824) return round($bytes / 1073741824, 2) . ' GB';
        if ($bytes >= 1048576)    return round($bytes / 1048576,    2) . ' MB';
        if ($bytes >= 1024)       return round($bytes / 1024,       2) . ' KB';
        return $bytes . ' B';
    }
}

// If invoked directly as a standalone script
if (str_contains($_SERVER['SCRIPT_FILENAME'] ?? '', 'upload.php') && !defined('ROUTED_FROM_INDEX')) {
    handleUpload();
}
