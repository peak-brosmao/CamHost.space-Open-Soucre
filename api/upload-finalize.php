<?php
// =============================================
// CamHost.space — Chunked Upload Finalize
// Developer: PEAK BROSMAO · peakbrosmao.me
// =============================================
// Called after ALL chunks have been uploaded via /upload-chunk.
// Saves the assembled file metadata to SQLite and returns the share URL.

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

function handleUploadFinalize(): void {
    $user = requireVerified();

    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) {
        // Try POST form data as fallback
        $body = $_POST;
    }

    $fileIds    = $body['file_ids']    ?? [];
    $messageIds = $body['message_ids'] ?? [];
    $name       = basename($body['original_name'] ?? 'Unknown');
    $mimeType   = $body['mime_type']   ?? 'application/octet-stream';
    $sizeBytes  = (int)($body['total_size'] ?? 0);
    $folderId   = !empty($body['folder_id']) ? (int)$body['folder_id'] : null;
    $description = trim($body['description'] ?? '');
    $isPublic   = (int)(filter_var($body['is_public'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 1 : 0);

    if (empty($fileIds) || empty($name)) {
        jsonError('Missing required fields: file_ids, original_name', 400);
    }

    // Validate folder belongs to user
    if ($folderId !== null) {
        try {
            $chk = db()->prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?');
            $chk->execute([$folderId, $user['id']]);
            if (!$chk->fetchColumn()) {
                $folderId = null;
            }
        } catch (Exception $e) {
            $folderId = null;
        }
    }

    // Store file_ids as JSON array (same as chunked upload in upload.php)
    $telegramFileId = count($fileIds) === 1 ? $fileIds[0] : json_encode($fileIds);
    $messageId      = $messageIds[0] ?? null;

    // Generate share token & insert to DB
    $shareToken = bin2hex(random_bytes(16));
    $inserted   = false;
    $attempts   = 0;
    $lastErr    = null;
    $newId      = null;

    while ($attempts < 15 && !$inserted) {
        $attempts++;
        try {
            $pdo  = db();
            $stmt = $pdo->prepare('
                INSERT INTO files (user_id, folder_id, original_name, mime_type, size_bytes, telegram_file_id, message_id, description, is_public, share_token)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $user['id'],
                $folderId,
                $name,
                $mimeType,
                $sizeBytes,
                $telegramFileId,
                $messageId,
                $description ?: null,
                $isPublic,
                $shareToken,
            ]);
            $newId    = (int)$pdo->lastInsertId();
            $inserted = true;
        } catch (PDOException $e) {
            $lastErr = $e;
            if (str_contains(strtolower($e->getMessage()), 'locked') && $attempts < 15) {
                db(true);
                usleep(200000 * $attempts);
                continue;
            }
            break;
        } catch (Throwable $e) {
            $lastErr = $e;
            break;
        }
    }

    if (!$inserted) {
        $msg = $lastErr ? $lastErr->getMessage() : 'Unknown DB error';
        error_log('[CamHost Finalize Error] ' . $msg);
        jsonError('Failed to save file metadata: ' . $msg, 500);
    }

    $shareUrl = FRONTEND_URL . '/share/' . $shareToken;

    jsonSuccess([
        'file' => [
            'id'            => $newId,
            'folder_id'     => $folderId,
            'name'          => $name,
            'file_name'     => $name,
            'original_name' => $name,
            'mime'          => $mimeType,
            'mime_type'     => $mimeType,
            'size'          => $sizeBytes,
            'file_size'     => $sizeBytes,
            'size_bytes'    => $sizeBytes,
            'size_human'    => formatBytes($sizeBytes),
            'downloads'     => 0,
            'is_public'     => $isPublic,
            'share_token'   => $shareToken,
            'share_url'     => $shareUrl,
            'description'   => $description ?: null,
            'created_at'    => date('c'),
        ],
        'share_url'   => $shareUrl,
        'share_token' => $shareToken,
        'message'     => 'File uploaded successfully',
        'mode'        => 'client-chunked',
    ], 201);
}

if (str_contains($_SERVER['SCRIPT_FILENAME'] ?? '', 'upload-finalize.php') && !defined('ROUTED_FROM_INDEX')) {
    handleUploadFinalize();
}
