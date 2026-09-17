<?php
// =============================================
// CamHost.space — File Management Handler
// Developer: PEAK BROSMAO · peakbrosmao.me
// =============================================

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

/**
 * GET /api/files
 * Optional query: ?search=&sort=created_at&order=DESC&limit=50&offset=0
 * Returns list of all files for the authenticated user.
 */
function handleListFiles(): void {
    $user     = requireAuth();
    $search   = trim($_GET['search'] ?? '');
    $folderId = $_GET['folder_id'] ?? null;
    $sort     = in_array($_GET['sort'] ?? '', ['created_at','original_name','size_bytes']) ? $_GET['sort'] : 'created_at';
    $order    = strtoupper($_GET['order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
    $limit    = min((int)($_GET['limit']  ?? 50), 200);
    $offset   = max((int)($_GET['offset'] ?? 0), 0);

    $where = 'WHERE user_id = ?';
    $params = [$user['id']];

    if ($search !== '') {
        $where   .= ' AND original_name LIKE ?';
        $params[] = '%' . $search . '%';
    }

    if ($folderId !== null && $folderId !== 'all') {
        if ($folderId === 'root' || $folderId === '' || $folderId === '0') {
            $where .= ' AND folder_id IS NULL';
        } else {
            $where   .= ' AND folder_id = ?';
            $params[] = (int)$folderId;
        }
    }

    $sql = "SELECT id, folder_id, original_name, mime_type, size_bytes, share_token, is_public, description, created_at
            FROM files
            $where
            ORDER BY $sort $order
            LIMIT $limit OFFSET $offset";

    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $files = $stmt->fetchAll();

    // Count total
    $countSql = "SELECT COUNT(*) FROM files $where";
    $countStmt = db()->prepare($countSql);
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    // Enrich with human-readable size
    foreach ($files as &$file) {
        $file['size_human'] = formatBytes((int)$file['size_bytes']);
        $file['id']         = (int)$file['id'];
        $file['size_bytes'] = (int)$file['size_bytes'];
        $file['is_public']  = (int)($file['is_public'] ?? 0);
        $file['share_url']  = !empty($file['share_token']) ? 'https://camhost.space/share.html?token=' . $file['share_token'] : null;
    }

    jsonSuccess([
        'files'  => $files,
        'total'  => $total,
        'limit'  => $limit,
        'offset' => $offset,
    ]);
}

/**
 * GET /api/files/{id}
 * Returns metadata for a single file.
 */
function handleGetFile(int $id): void {
    $user = requireAuth();
    $file = fetchFile($id, $user['id']);

    $file['size_human'] = formatBytes((int)$file['size_bytes']);
    $file['id']         = (int)$file['id'];
    $file['size_bytes'] = (int)$file['size_bytes'];

    jsonSuccess(['file' => $file]);
}

/**
 * DELETE /api/files/{id}
 * Deletes the file record from SQLite AND deletes the Telegram message.
 */
function handleDeleteFile(int $id): void {
    $user = requireAuth();
    $file = fetchFile($id, $user['id']);

    // Delete from Telegram (best-effort — non-fatal if it fails)
    if (!empty($file['message_id'])) {
        deleteFromTelegram((int)$file['message_id']);
    }

    // Delete from DB
    $stmt = db()->prepare('DELETE FROM files WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $user['id']]);

    jsonSuccess(['message' => 'File deleted successfully']);
}

/**
 * PUT /api/files/{id}/rename
 * Body: { name: string }
 */
function handleRenameFile(int $id): void {
    $user = requireAuth();
    $file = fetchFile($id, $user['id']);

    $body = json_decode(file_get_contents('php://input'), true);
    $name = trim($body['name'] ?? '');

    if (!$name) {
        jsonError('New file name cannot be empty', 400);
    }

    // Clean up filename (prevent directory traversal characters)
    $name = basename(str_replace(['/', '\\'], '', $name));
    if (!$name) {
        jsonError('Invalid file name', 400);
    }

    $stmt = db()->prepare('UPDATE files SET original_name = ? WHERE id = ? AND user_id = ?');
    $stmt->execute([$name, $id, $user['id']]);

    jsonSuccess([
        'message' => 'File renamed successfully',
        'file' => [
            'id' => $id,
            'original_name' => $name,
        ]
    ]);
}

/**
 * POST /api/files/{id}/share
 * Toggle or generate public sharing token.
 * Body: { is_public?: boolean }
 */
function handleShareFile(int $id): void {
    $user = requireAuth();
    $file = fetchFile($id, $user['id']);

    $token = $file['share_token'];
    if (empty($token)) {
        $token = bin2hex(random_bytes(16));
    }

    $body = json_decode(file_get_contents('php://input'), true);
    $isPublic = isset($body['is_public']) ? ($body['is_public'] ? 1 : 0) : 1;

    $stmt = db()->prepare('UPDATE files SET share_token = ?, is_public = ? WHERE id = ? AND user_id = ?');
    $stmt->execute([$token, $isPublic, $id, $user['id']]);

    $shareUrl = 'https://camhost.space/share.html?token=' . $token;

    jsonSuccess([
        'share_token' => $token,
        'share_url'   => $shareUrl,
        'is_public'   => (bool)$isPublic,
        'message'     => $isPublic ? 'Share link activated' : 'Share link disabled',
    ]);
}

/**
 * GET /api/share/{token}
 * Public endpoint: returns public file information without requiring authentication.
 */
function handleGetSharedFile(string $token): void {
    $stmt = db()->prepare('SELECT id, original_name, mime_type, size_bytes, created_at FROM files WHERE share_token = ? AND is_public = 1');
    $stmt->execute([$token]);
    $file = $stmt->fetch();

    if (!$file) {
        jsonError('Shared file not found or link has been disabled', 404);
    }

    $file['id']         = (int)$file['id'];
    $file['size_bytes'] = (int)$file['size_bytes'];
    $file['size_human'] = formatBytes((int)$file['size_bytes']);

    jsonSuccess(['file' => $file]);
}

/**
 * GET /api/share/{token}/download
 * Public endpoint: streams the shared file download.
 */
function handleDownloadSharedFile(string $token): void {
    $stmt = db()->prepare('SELECT telegram_file_id, original_name, mime_type FROM files WHERE share_token = ? AND is_public = 1');
    $stmt->execute([$token]);
    $file = $stmt->fetch();

    if (!$file) {
        jsonError('Shared file not found or link has been disabled', 404);
    }

    $info = getTelegramFileInfo($file['telegram_file_id']);
    if (!$info['ok'] || empty($info['result']['file_path'])) {
        jsonError('Could not retrieve file stream from Telegram', 502);
    }

    $filePath    = $info['result']['file_path'];
    $downloadUrl = TELEGRAM_FILE_BASE . '/' . $filePath;

    proxyDownload($downloadUrl, $file['original_name'], $file['mime_type']);
}

// ── Telegram Helpers ────────────────────────────────────────────

function getTelegramFileInfo(string $fileId): array {
    $url = TELEGRAM_API_BASE . '/getFile?file_id=' . urlencode($fileId);
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_CONNECTTIMEOUT => CURL_CONNECT_TIMEOUT,
    ]);
    $res = curl_exec($ch);
    curl_close($ch);
    return json_decode($res, true) ?? ['ok' => false];
}

function deleteFromTelegram(int $messageId): bool {
    $url  = TELEGRAM_API_BASE . '/deleteMessage';
    $ch   = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query([
            'chat_id'    => TELEGRAM_CHAT_ID,
            'message_id' => $messageId,
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_CONNECTTIMEOUT => CURL_CONNECT_TIMEOUT,
    ]);
    $res  = curl_exec($ch);
    curl_close($ch);
    $json = json_decode($res, true);
    return $json['ok'] ?? false;
}

/**
 * Stream the Telegram download URL through PHP to the client.
 * This hides the bot token from the browser.
 * Uses chunked streaming to handle files up to 2 GB without memory issues.
 */
function proxyDownload(string $url, string $name, string $mime): void {
    // Disable output buffering to stream large files efficiently
    while (ob_get_level()) ob_end_clean();

    header('Content-Type: ' . $mime);
    header('Content-Disposition: attachment; filename="' . addslashes($name) . '"');
    header('X-Accel-Buffering: no');   // Disable nginx buffering
    header('Cache-Control: no-cache');

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => false,
        CURLOPT_TIMEOUT        => CURL_UPLOAD_TIMEOUT,  // Reuse large-file timeout
        CURLOPT_CONNECTTIMEOUT => CURL_CONNECT_TIMEOUT,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_BUFFERSIZE     => 131072, // 128 KB chunks for smooth streaming
        CURLOPT_WRITEFUNCTION  => function($curl, $data) {
            echo $data;
            flush(); // Push each chunk to browser immediately
            return strlen($data);
        },
    ]);

    curl_exec($ch);
    curl_close($ch);
    exit;
}

// ── DB Helper ───────────────────────────────────────────────────

function fetchFile(int $id, int $userId): array {
    $stmt = db()->prepare('SELECT * FROM files WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    $file = $stmt->fetch();

    if (!$file) {
        jsonError('File not found', 404);
    }

    return $file;
}

// ── Utility ─────────────────────────────────────────────────────

function formatBytes(int $bytes): string {
    if ($bytes >= 1073741824) return round($bytes / 1073741824, 2) . ' GB';
    if ($bytes >= 1048576)    return round($bytes / 1048576,    2) . ' MB';
    if ($bytes >= 1024)       return round($bytes / 1024,       2) . ' KB';
    return $bytes . ' B';
}
