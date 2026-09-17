<?php
// =============================================
// CamHost.space — Folder Management Handler
// Developer: PEAK BROSMAO · peakbrosmao.me
// =============================================

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

/** GET /folders — list all folders for the authenticated user */
function handleListFolders(): void {
    $user = requireAuth();
    $stmt = db()->prepare('
        SELECT f.id, f.name, f.created_at,
               COUNT(fi.id) AS file_count,
               COALESCE(SUM(fi.size_bytes), 0) AS total_bytes
        FROM folders f
        LEFT JOIN files fi ON fi.folder_id = f.id
        WHERE f.user_id = ?
        GROUP BY f.id
        ORDER BY f.name ASC
    ');
    $stmt->execute([$user['id']]);
    $folders = $stmt->fetchAll();

    foreach ($folders as &$folder) {
        $folder['id']          = (int)$folder['id'];
        $folder['folder_name'] = $folder['name'];
        $folder['file_count']  = (int)$folder['file_count'];
        $folder['total_bytes'] = (int)$folder['total_bytes'];
        $folder['size_human']  = formatFolderBytes((int)$folder['total_bytes']);
    }

    jsonSuccess(['folders' => $folders]);
}

/** POST /folders — create a new folder */
function handleCreateFolder(): void {
    $user = requireAuth();
    $body = json_decode(file_get_contents('php://input'), true);
    $name = trim($body['name'] ?? $body['folder_name'] ?? '');

    if (!$name) jsonError('Folder name is required', 400);
    if (strlen($name) > 100) jsonError('Folder name too long (max 100 chars)', 400);
    if (preg_match('/[\/\\\\<>:"|?*]/', $name)) jsonError('Folder name contains invalid characters', 400);

    try {
        $stmt = db()->prepare('INSERT INTO folders (user_id, name) VALUES (?, ?)');
        $stmt->execute([$user['id'], $name]);
        $id = (int)db()->lastInsertId();

        jsonSuccess([
            'folder' => [
                'id'          => $id,
                'name'        => $name,
                'folder_name' => $name,
                'file_count'  => 0,
                'created_at'  => date('c')
            ],
            'message' => 'Folder created',
        ], 201);
    } catch (PDOException $e) {
        if (str_contains($e->getMessage(), 'UNIQUE')) {
            jsonError("A folder named \"$name\" already exists", 409);
        }
        throw $e;
    }
}

/** PUT /folders/{id} — rename folder */
function handleRenameFolder(int $id): void {
    $user = requireAuth();
    $body = json_decode(file_get_contents('php://input'), true);
    $name = trim($body['name'] ?? $body['folder_name'] ?? '');

    if (!$name) jsonError('New folder name is required', 400);

    $folder = fetchFolder($id, $user['id']);

    try {
        $stmt = db()->prepare('UPDATE folders SET name = ? WHERE id = ? AND user_id = ?');
        $stmt->execute([$name, $id, $user['id']]);

        jsonSuccess([
            'folder' => array_merge($folder, ['name' => $name, 'folder_name' => $name]),
            'message' => 'Folder renamed'
        ]);
    } catch (PDOException $e) {
        if (str_contains($e->getMessage(), 'UNIQUE')) {
            jsonError("A folder named \"$name\" already exists", 409);
        }
        throw $e;
    }
}

/** DELETE /folders/{id} — delete folder (files become root-level) */
function handleDeleteFolder(int $id): void {
    $user   = requireAuth();
    $folder = fetchFolder($id, $user['id']);

    // Move files to root (folder_id = NULL) before deleting
    $stmt = db()->prepare('UPDATE files SET folder_id = NULL WHERE folder_id = ? AND user_id = ?');
    $stmt->execute([$id, $user['id']]);

    $stmt = db()->prepare('DELETE FROM folders WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $user['id']]);

    jsonSuccess(['message' => "Folder \"{$folder['name']}\" deleted. Files moved to root."]);
}

// ── Helpers ─────────────────────────────────────────────────────

function fetchFolder(int $id, int $userId): array {
    $stmt = db()->prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    $folder = $stmt->fetch();
    if (!$folder) jsonError('Folder not found', 404);
    return $folder;
}

function formatFolderBytes(int $bytes): string {
    if ($bytes >= 1073741824) return round($bytes / 1073741824, 2) . ' GB';
    if ($bytes >= 1048576)    return round($bytes / 1048576,    2) . ' MB';
    if ($bytes >= 1024)       return round($bytes / 1024,       2) . ' KB';
    return $bytes . ' B';
}
