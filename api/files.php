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

    $sql = "SELECT id, folder_id, original_name, mime_type, size_bytes, share_token, is_public, description, COALESCE(downloads, 0) as downloads, download_limit, created_at
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

    // Enrich with human-readable size and consistent aliases
    foreach ($files as &$file) {
        $file['id']            = (int)$file['id'];
        $origName              = !empty($file['original_name']) ? $file['original_name'] : 'Untitled File';
        $file['original_name'] = $origName;
        $file['file_name']     = $origName;
        $file['name']          = $origName;
        $sizeBytes             = (int)($file['size_bytes'] ?? 0);
        $file['size_bytes']    = $sizeBytes;
        $file['file_size']     = $sizeBytes;
        $file['size']          = $sizeBytes;
        $file['size_human']    = formatBytes($sizeBytes);
        $file['downloads']     = (int)($file['downloads'] ?? 0);
        $file['download_limit'] = !empty($file['download_limit']) ? (int)$file['download_limit'] : null;
        $file['is_public']     = (int)($file['is_public'] ?? 0);
        $file['share_url']     = !empty($file['share_token']) ? 'https://camhost.space/share/' . $file['share_token'] : null;
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

    $file['id']            = (int)$file['id'];
    $origName              = !empty($file['original_name']) ? $file['original_name'] : 'Untitled File';
    $file['original_name'] = $origName;
    $file['file_name']     = $origName;
    $file['name']          = $origName;
    $sizeBytes             = (int)($file['size_bytes'] ?? 0);
    $file['size_bytes']    = $sizeBytes;
    $file['file_size']     = $sizeBytes;
    $file['size']          = $sizeBytes;
    $file['size_human']    = formatBytes($sizeBytes);
    $file['downloads']     = (int)($file['downloads'] ?? 0);
    $file['download_limit'] = !empty($file['download_limit']) ? (int)$file['download_limit'] : null;

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
    $name = trim($body['name'] ?? $body['file_name'] ?? '');

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
            'name' => $name,
            'file_name' => $name,
            'original_name' => $name,
        ]
    ]);
}

/**
 * PUT /api/files/{id} or PUT /api/files/{id}/move
 * Update file properties (move to folder, rename)
 * Body: { folder_id?: int|null|'root', name?: string, file_name?: string }
 */
function handleUpdateFile(int $id): void {
    $user = requireAuth();
    $file = fetchFile($id, $user['id']);

    $rawInput = file_get_contents('php://input');
    $body = json_decode($rawInput, true) ?? [];

    $fields = [];
    $params = [];

    // Handle moving to folder
    if (array_key_exists('folder_id', $body)) {
        $rawFid = $body['folder_id'];
        $folderId = null;
        if ($rawFid !== null && $rawFid !== '' && $rawFid !== 'root' && (int)$rawFid > 0) {
            $folderId = (int)$rawFid;
            // Verify folder exists and belongs to user
            $fStmt = db()->prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?');
            $fStmt->execute([$folderId, $user['id']]);
            if (!$fStmt->fetch()) {
                jsonError('Target folder not found', 404);
            }
        }
        $fields[] = 'folder_id = ?';
        $params[] = $folderId;
    }

    // Handle rename / file name update
    if (isset($body['name']) || isset($body['file_name']) || isset($body['original_name'])) {
        $rawName = trim($body['name'] ?? $body['file_name'] ?? $body['original_name'] ?? '');
        if ($rawName) {
            $cleanName = basename(str_replace(['/', '\\'], '', $rawName));
            if ($cleanName) {
                $fields[] = 'original_name = ?';
                $params[] = $cleanName;
            }
        }
    }

    if (empty($fields)) {
        jsonError('No valid fields provided to update', 400);
    }

    $params[] = $id;
    $params[] = $user['id'];
    $sql = 'UPDATE files SET ' . implode(', ', $fields) . ' WHERE id = ? AND user_id = ?';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);

    jsonSuccess([
        'message' => 'File updated successfully',
        'file_id' => $id,
        'folder_id' => $folderId ?? $file['folder_id'] ?? null,
    ]);
}


/**
 * POST /api/files/{id}/share
 * Toggle or generate public sharing token.
 * Body: { is_public?: boolean|int, download_limit?: int|null }
 */
function handleShareFile(int $id): void {
    $user = requireAuth();
    $file = fetchFile($id, $user['id']);

    $token = $file['share_token'];
    if (empty($token)) {
        $token = bin2hex(random_bytes(16));
    }

    $body = json_decode(file_get_contents('php://input'), true);
    $isPublic = isset($body['is_public']) ? ((int)$body['is_public'] === 1 || $body['is_public'] === true ? 1 : 0) : 1;

    $downloadLimit = null;
    if (isset($body['download_limit']) && $body['download_limit'] !== '' && $body['download_limit'] !== null) {
        $lim = (int)$body['download_limit'];
        $downloadLimit = $lim > 0 ? $lim : null;
    }

    $stmt = db()->prepare('UPDATE files SET share_token = ?, is_public = ?, download_limit = ? WHERE id = ? AND user_id = ?');
    $stmt->execute([$token, $isPublic, $downloadLimit, $id, $user['id']]);

    $shareUrl = 'https://camhost.space/share/' . $token;

    jsonSuccess([
        'share_token'    => $token,
        'share_url'      => $shareUrl,
        'is_public'      => (int)$isPublic,
        'download_limit' => $downloadLimit,
        'message'        => $isPublic ? 'Public sharing link activated' : 'File set to private (sharing disabled)',
    ]);
}

/**
 * GET /api/share/{token}
 * Public endpoint: returns public file information without requiring authentication.
 */
function handleGetSharedFile(string $token): void {
    $stmt = db()->prepare('SELECT id, original_name, mime_type, size_bytes, COALESCE(downloads, 0) as downloads, download_limit, created_at FROM files WHERE share_token = ? AND is_public = 1');
    $stmt->execute([$token]);
    $file = $stmt->fetch();

    if (!$file) {
        jsonError('Shared file not found or sharing has been disabled (set to private)', 404);
    }

    $downloadLimit = !empty($file['download_limit']) ? (int)$file['download_limit'] : null;
    $downloads     = (int)($file['downloads'] ?? 0);

    if ($downloadLimit !== null && $downloads >= $downloadLimit) {
        jsonError("This shared file has reached its download limit ($downloadLimit downloads) and is no longer available.", 403);
    }

    $file['id']            = (int)$file['id'];
    $origName              = !empty($file['original_name']) ? $file['original_name'] : 'Shared File';
    $file['original_name'] = $origName;
    $file['file_name']     = $origName;
    $file['name']          = $origName;
    $sizeBytes             = (int)($file['size_bytes'] ?? 0);
    $file['size_bytes']    = $sizeBytes;
    $file['file_size']     = $sizeBytes;
    $file['size']          = $sizeBytes;
    $file['size_human']    = formatBytes($sizeBytes);
    $file['downloads']     = $downloads;
    $file['download_limit'] = $downloadLimit;

    jsonSuccess(['file' => $file]);
}

/**
 * GET /api/files/{id}/download
 * Authenticated endpoint: streams file download for owner or admin.
 */
function handleDownloadFile(int $id): void {
    $user = requireAuth();
    $stmt = db()->prepare('SELECT * FROM files WHERE id = ?');
    $stmt->execute([$id]);
    $file = $stmt->fetch();

    if (!$file) {
        jsonError('File not found', 404);
    }

    if ($file['user_id'] != $user['id'] && ($user['role'] ?? '') !== 'admin') {
        jsonError('Access denied', 403);
    }

    if (!empty($file['is_blocked'])) {
        jsonError('This file has been suspended or blocked due to security or policy violations.', 403);
    }

    // Increment download count
    try {
        db()->prepare('UPDATE files SET downloads = downloads + 1 WHERE id = ?')->execute([$id]);
    } catch (Exception $e) {}

    streamTelegramFile($file['telegram_file_id'], $file['original_name'], $file['mime_type'], (int)($file['size_bytes'] ?? 0));
}

/**
 * GET /api/share/{token}/download
 * Public endpoint: streams the shared file download.
 */
function handleDownloadSharedFile(string $token): void {
    $stmt = db()->prepare('SELECT id, telegram_file_id, original_name, mime_type, size_bytes, is_blocked, COALESCE(downloads, 0) as downloads, download_limit FROM files WHERE share_token = ? AND is_public = 1');
    $stmt->execute([$token]);
    $file = $stmt->fetch();

    if (!$file) {
        jsonError('Shared file not found or link has been disabled (set to private)', 404);
    }

    if (!empty($file['is_blocked'])) {
        jsonError('This shared file has been suspended or blocked by an administrator.', 403);
    }

    if (!empty($file['download_limit']) && (int)$file['downloads'] >= (int)$file['download_limit']) {
        jsonError('This shared file has reached its download limit (' . $file['download_limit'] . ' downloads) and can no longer be downloaded.', 403);
    }

    // Increment download count
    try {
        db()->prepare('UPDATE files SET downloads = downloads + 1 WHERE id = ?')->execute([$file['id']]);
    } catch (Exception $e) {}

    streamTelegramFile($file['telegram_file_id'], $file['original_name'], $file['mime_type'], (int)($file['size_bytes'] ?? 0));
}

/**
 * POST /api/share/{token}/report
 * Public endpoint: report a shared file for policy/DMCA/abuse violation.
 */
function handleReportSharedFile(string $token): void {
    $stmt = db()->prepare('SELECT id, original_name, description, is_blocked FROM files WHERE share_token = ?');
    $stmt->execute([$token]);
    $file = $stmt->fetch();

    if (!$file) {
        jsonError('Shared file not found or invalid token', 404);
    }

    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true) ?? [];

    $reason  = trim($body['reason'] ?? 'Abuse / Policy Violation');
    $details = trim($body['details'] ?? '');
    $reporterEmail = trim($body['email'] ?? '');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

    if (empty($reason)) {
        jsonError('Reason for report is required', 400);
    }

    // Insert into audit_logs so administrators see it immediately in Admin panel
    try {
        $logStmt = db()->prepare('INSERT INTO audit_logs (admin_id, action, target_type, target_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)');
        $logStmt->execute([
            null,
            'FILE_REPORTED',
            'file',
            (string)$file['id'],
            "Report: {$reason}. Email: {$reporterEmail}. Details: {$details}",
            $ip,
        ]);
    } catch (Exception $e) {}

    // Tag file description with reported note
    try {
        $existing = trim($file['description'] ?? '');
        $updatedDesc = $existing ? ($existing . " [REPORTED: {$reason}]") : "[REPORTED: {$reason}]";
        db()->prepare('UPDATE files SET description = ? WHERE id = ?')->execute([$updatedDesc, $file['id']]);
    } catch (Exception $e) {}

    jsonSuccess([
        'message' => 'Thank you for your report. The file has been flagged and submitted for administrative moderation.',
    ]);
}

// ── Telegram Helpers ────────────────────────────────────────────


function getTelegramFileInfo(string $fileId): array {
    $url = TELEGRAM_API_BASE . '/getFile?file_id=' . urlencode($fileId);
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
    ]);
    $res = curl_exec($ch);
    $curlErr = curl_error($ch);
    curl_close($ch);
    if ($curlErr) {
        error_log('[CamHost getTelegramFileInfo Error] ' . $curlErr);
    }
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
/**
 * Stream a single file or a multi-part chunked file from Telegram.
 */
function streamTelegramFile(string $telegramFileId, string $originalName, string $mimeType, int $sizeBytes = 0): void {
    $chunkIds = null;
    $trimmed = trim($telegramFileId);
    if (str_starts_with($trimmed, '[')) {
        $decoded = json_decode($trimmed, true);
        if (is_array($decoded) && !empty($decoded)) {
            $chunkIds = $decoded;
        }
    }

    if ($chunkIds !== null) {
        proxyDownloadChunks($chunkIds, $originalName, $mimeType, $sizeBytes);
        return;
    }

    $info = getTelegramFileInfo($telegramFileId);
    if (!$info['ok'] || empty($info['result']['file_path'])) {
        jsonError('Could not retrieve file stream from Telegram', 502);
    }

    $filePath    = $info['result']['file_path'];
    $downloadUrl = TELEGRAM_FILE_BASE . '/' . $filePath;

    proxyDownload($downloadUrl, $originalName, $mimeType, $sizeBytes);
}

/**
 * Stream the Telegram download URL through PHP to the client.
 * Uses chunked streaming to handle files up to 2 GB without memory issues.
 */
function proxyDownload(string $url, string $name, string $mime, int $sizeBytes = 0): void {
    @set_time_limit(3600);
    while (ob_get_level()) ob_end_clean();

    $safeName = basename($name);
    if (empty($safeName)) $safeName = 'download';
    $asciiName = preg_replace('/[^\x20-\x7e]/', '', str_replace(['"', ';', '\\', '/'], '', $safeName));
    if (empty($asciiName)) $asciiName = 'download';
    $encodedName = rawurlencode($safeName);

    header('Content-Type: ' . ($mime ?: 'application/octet-stream'));
    header('Content-Disposition: attachment; filename="' . $asciiName . '"; filename*=UTF-8\'\'' . $encodedName);
    if ($sizeBytes > 0) {
        header('Content-Length: ' . $sizeBytes);
    }
    header('X-Accel-Buffering: no');
    header('Cache-Control: private, no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => false,
        CURLOPT_TIMEOUT        => CURL_UPLOAD_TIMEOUT,
        CURLOPT_CONNECTTIMEOUT => CURL_CONNECT_TIMEOUT,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_BUFFERSIZE     => 131072,
        CURLOPT_WRITEFUNCTION  => function($curl, $data) {
            echo $data;
            flush();
            return strlen($data);
        },
    ]);

    curl_exec($ch);
    curl_close($ch);
    exit;
}

/**
 * Stream multi-part chunks consecutively to the client.
 * Reassembles chunks on-the-fly into one seamless file stream in the browser.
 */
function proxyDownloadChunks(array $chunkIds, string $name, string $mime, int $sizeBytes = 0): void {
    @set_time_limit(3600);
    while (ob_get_level()) ob_end_clean();

    $safeName = basename($name);
    if (empty($safeName)) $safeName = 'download';
    $asciiName = preg_replace('/[^\x20-\x7e]/', '', str_replace(['"', ';', '\\', '/'], '', $safeName));
    if (empty($asciiName)) $asciiName = 'download';
    $encodedName = rawurlencode($safeName);

    header('Content-Type: ' . ($mime ?: 'application/octet-stream'));
    header('Content-Disposition: attachment; filename="' . $asciiName . '"; filename*=UTF-8\'\'' . $encodedName);
    if ($sizeBytes > 0) {
        header('Content-Length: ' . $sizeBytes);
    }
    header('X-Accel-Buffering: no');
    header('Cache-Control: private, no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');

    foreach ($chunkIds as $i => $chunkId) {
        $info = getTelegramFileInfo($chunkId);

        if (!$info['ok'] || empty($info['result']['file_path'])) {
            // Telegram getFile failed — most common cause is chunk > 20MB (old 49MB uploads).
            // Log for debugging and abort with a meaningful error.
            $errDesc = $info['description'] ?? ($info['error_code'] ?? 'unknown');
            error_log("[CamHost Download] Chunk {$i} getFile failed: {$errDesc} | file_id=" . substr($chunkId, 0, 20));

            // If headers not yet sent, we can still return a JSON error
            if (!headers_sent()) {
                while (ob_get_level()) ob_end_clean();
                http_response_code(502);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'error'   => 'This file was uploaded with an older system and cannot be downloaded directly. Please re-upload the file.',
                ]);
                exit;
            }
            // Headers already sent — just exit to stop the broken stream
            exit;
        }

        $chunkUrl = TELEGRAM_FILE_BASE . '/' . $info['result']['file_path'];
        $ch = curl_init($chunkUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_TIMEOUT        => 3600,
            CURLOPT_CONNECTTIMEOUT => 30,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_BUFFERSIZE     => 131072,
            CURLOPT_WRITEFUNCTION  => function($curl, $data) {
                echo $data;
                flush();
                return strlen($data);
            },
        ]);
        $curlErr = null;
        if (!curl_exec($ch)) {
            $curlErr = curl_error($ch);
            error_log("[CamHost Download] Chunk {$i} curl failed: {$curlErr}");
        }
        curl_close($ch);

        if ($curlErr) {
            exit; // Stop broken stream — browser will see truncated download
        }
    }
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

if (!function_exists('formatBytes')) {
    function formatBytes(int $bytes): string {
        if ($bytes >= 1073741824) return round($bytes / 1073741824, 2) . ' GB';
        if ($bytes >= 1048576)    return round($bytes / 1048576,    2) . ' MB';
        if ($bytes >= 1024)       return round($bytes / 1024,       2) . ' KB';
        return $bytes . ' B';
    }
}
