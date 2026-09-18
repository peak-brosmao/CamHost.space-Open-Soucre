<?php
// =============================================
// CamHost.space — Client-Side Chunk Upload
// Developer: PEAK BROSMAO · peakbrosmao.me
// =============================================
// Receives a single file chunk from the browser,
// sends it directly to Telegram, returns file_id.
// Called once per chunk by uploadChunked() in client.js.

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

function handleUploadChunk(): void {
    @set_time_limit(600);
    @ini_set('memory_limit', '256M');

    $user = requireVerified();
    enforceRateLimit('upload_chunk', 200, 60); // 200 chunks/min — large files need many chunks

    if (empty($_FILES['chunk'])) {
        jsonError('No chunk data received.', 400);
    }

    $f = $_FILES['chunk'];
    if ($f['error'] !== UPLOAD_ERR_OK) {
        jsonError('Chunk upload error: ' . $f['error'], 400);
    }

    // Required metadata
    $chunkIndex  = (int)($_POST['chunk_index']  ?? 0);
    $totalChunks = (int)($_POST['total_chunks'] ?? 1);
    $originalName = basename($_POST['original_name'] ?? 'file');
    $totalSize   = (int)($_POST['total_size']   ?? $f['size']);

    // Security: block dangerous extensions
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $dangerousExts = ['php', 'php3', 'php4', 'php5', 'phtml', 'phar', 'htaccess', 'htpasswd'];
    if (in_array($ext, $dangerousExts, true)) {
        jsonError('Security restriction: Server scripts cannot be uploaded.', 400);
    }

    // Size guard: total file must not exceed allowed limit
    $maxBytes = UPLOAD_MAX_MB * 1024 * 1024;
    if ($totalSize > $maxBytes) {
        jsonError('File too large (' . formatBytes($totalSize) . '). Max: ' . UPLOAD_MAX_MB . ' MB.', 413);
    }

    if (empty(TELEGRAM_BOT_TOKEN) || empty(TELEGRAM_CHAT_ID)) {
        jsonError('Telegram is not configured.', 500);
    }

    $tmpPath = $f['tmp_name'];

    // Only attach caption to the first chunk (index 0)
    $caption = '';
    if ($chunkIndex === 0) {
        $desc = trim($_POST['description'] ?? '');
        if (!empty($desc)) {
            $caption = htmlspecialchars($desc, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        }
    }

    // Send chunk to Telegram immediately
    $result = sendChunkToTelegram($tmpPath, $originalName, $caption);

    if (!$result['ok']) {
        $desc = $result['description'] ?? 'Unknown error';
        $prefix = "Chunk " . ($chunkIndex + 1) . "/{$totalChunks}: ";
        jsonError($prefix . 'Telegram upload failed: ' . $desc, 502);
    }

    $msg     = $result['result'];
    $fileId  = extractFileIdFromMsg($msg);
    $msgId   = $msg['message_id'] ?? null;

    if (!$fileId) {
        jsonError('Telegram returned no file_id for chunk ' . ($chunkIndex + 1), 502);
    }

    error_log("[CamHost Chunk] Part " . ($chunkIndex + 1) . "/{$totalChunks} → Telegram OK, file_id: " . substr($fileId, 0, 20) . '...');

    jsonSuccess([
        'chunk_index' => $chunkIndex,
        'file_id'     => $fileId,
        'message_id'  => $msgId,
    ]);
}

function sendChunkToTelegram(string $path, string $name, string $caption = ''): array {
    $url  = TELEGRAM_API_BASE . '/sendDocument';
    $data = [
        'chat_id'              => TELEGRAM_CHAT_ID,
        'disable_notification' => 'true',
        'document'             => new CURLFile($path, 'application/octet-stream', $name),
    ];
    if (!empty($caption)) {
        $data['caption']    = $caption;
        $data['parse_mode'] = 'HTML';
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $data,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => CURL_UPLOAD_TIMEOUT,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
        CURLOPT_TCP_NODELAY    => 1,
        CURLOPT_TCP_KEEPALIVE  => 1,
        CURLOPT_BUFFERSIZE     => 524288,
        CURLOPT_ENCODING       => '',
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

function extractFileIdFromMsg(array $msg): ?string {
    foreach (['document', 'sticker', 'animation', 'video', 'audio', 'voice', 'video_note'] as $key) {
        if (!empty($msg[$key]['file_id'])) return $msg[$key]['file_id'];
    }
    if (!empty($msg['photo']) && is_array($msg['photo'])) {
        $largest = end($msg['photo']);
        if (!empty($largest['file_id'])) return $largest['file_id'];
    }
    $finder = function($node) use (&$finder) {
        if (!is_array($node)) return null;
        if (!empty($node['file_id']) && is_string($node['file_id'])) return $node['file_id'];
        foreach ($node as $child) {
            $res = $finder($child);
            if ($res) return $res;
        }
        return null;
    };
    return $finder($msg);
}

if (str_contains($_SERVER['SCRIPT_FILENAME'] ?? '', 'upload-chunk.php') && !defined('ROUTED_FROM_INDEX')) {
    handleUploadChunk();
}
