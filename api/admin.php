<?php
// =======================================================
// CamHost.space — Enterprise Admin Control Center API
// Developer: PEAK BROSMAO · peakbrosmao.me
// =======================================================

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/security.php';

/**
 * Record an action to the audit_logs table.
 */
function logAudit(int $adminId, string $action, ?string $targetType = null, ?string $targetId = null, ?string $details = null): void {
    try {
        $ip = getClientIp();
        $stmt = db()->prepare('
            INSERT INTO audit_logs (admin_id, action, target_type, target_id, details, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime("now"))
        ');
        $stmt->execute([$adminId, $action, $targetType, $targetId, $details, $ip]);
    } catch (Exception $e) {
        error_log('[CamHost Admin Audit Error] ' . $e->getMessage());
    }
}

/**
 * Retrieve a system setting from SQLite.
 */
function getSystemSetting(string $key, string $default = ''): string {
    try {
        $stmt = db()->prepare('SELECT value FROM system_settings WHERE key = ?');
        $stmt->execute([$key]);
        $val = $stmt->fetchColumn();
        return ($val !== false && $val !== null) ? (string)$val : $default;
    } catch (Exception $e) {
        return $default;
    }
}

/**
 * Update a system setting in SQLite.
 */
function setSystemSetting(string $key, string $value): void {
    $stmt = db()->prepare('
        INSERT INTO system_settings (key, value, updated_at)
        VALUES (?, ?, datetime("now"))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime("now")
    ');
    $stmt->execute([$key, $value]);
}

/**
 * Main dispatcher for all /api/admin/* requests.
 */
function handleAdminRoutes(string $method, array $pathParts): void {
    // 1. Enforce strict Admin authentication
    $admin = requireAdmin();
    $adminId = (int)$admin['id'];

    $section = $pathParts[1] ?? 'overview';

    switch ($section) {
        case 'overview':
            handleAdminOverview($admin);
            break;

        case 'users':
            handleAdminUsers($method, $pathParts, $admin);
            break;

        case 'files':
            handleAdminFiles($method, $pathParts, $admin);
            break;

        case 'settings':
            handleAdminSettings($method, $admin);
            break;

        case 'audit-logs':
            handleAdminAuditLogs();
            break;

        case 'health':
            handleAdminHealth();
            break;

        case 'cache-clear':
            if ($method !== 'POST') jsonError('Method Not Allowed', 405);
            handleAdminCacheClear($admin);
            break;

        default:
            jsonError('Admin endpoint not found', 404);
    }
}

/**
 * GET /api/admin/overview
 * Real-time stats and metrics across users, files, storage, and system load.
 */
function handleAdminOverview(array $admin): void {
    $pdo = db();

    // 1. Total counts
    $totalUsers     = (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $bannedUsers    = (int)$pdo->query('SELECT COUNT(*) FROM users WHERE is_banned = 1')->fetchColumn();
    $verifiedUsers  = (int)$pdo->query('SELECT COUNT(*) FROM users WHERE is_verified = 1')->fetchColumn();
    $totalFiles     = (int)$pdo->query('SELECT COUNT(*) FROM files')->fetchColumn();
    $blockedFiles   = (int)$pdo->query('SELECT COUNT(*) FROM files WHERE is_blocked = 1')->fetchColumn();
    $totalStorage   = (int)$pdo->query('SELECT COALESCE(SUM(size_bytes), 0) FROM files')->fetchColumn();
    $totalDownloads = (int)$pdo->query('SELECT COALESCE(SUM(downloads), 0) FROM files')->fetchColumn();
    $totalSignups   = (int)$pdo->query('SELECT COUNT(*) FROM signups')->fetchColumn();
    $rateLimitHits  = (int)$pdo->query('SELECT COALESCE(SUM(hits), 0) FROM rate_limits')->fetchColumn();

    // 2. Recent 7-day registration trend
    $userTrend = $pdo->query("
        SELECT date(created_at) as day, COUNT(*) as count
        FROM users
        WHERE created_at >= datetime('now', '-7 days')
        GROUP BY date(created_at)
        ORDER BY day ASC
    ")->fetchAll();

    // 3. Recent 7-day file uploads trend
    $fileTrend = $pdo->query("
        SELECT date(created_at) as day, COUNT(*) as count, COALESCE(SUM(size_bytes), 0) as bytes
        FROM files
        WHERE created_at >= datetime('now', '-7 days')
        GROUP BY date(created_at)
        ORDER BY day ASC
    ")->fetchAll();

    // 4. Maintenance mode status
    $maintenanceMode = getSystemSetting('maintenance_mode', '0') === '1';

    jsonSuccess([
        'overview' => [
            'total_users'        => $totalUsers,
            'banned_users'       => $bannedUsers,
            'verified_users'     => $verifiedUsers,
            'total_files'        => $totalFiles,
            'blocked_files'      => $blockedFiles,
            'total_storage_bytes'=> $totalStorage,
            'total_downloads'    => $totalDownloads,
            'total_signups'      => $totalSignups,
            'rate_limit_hits'    => $rateLimitHits,
            'maintenance_mode'   => $maintenanceMode,
        ],
        'charts' => [
            'user_trend' => $userTrend,
            'file_trend' => $fileTrend,
        ],
        'server' => [
            'php_version'    => PHP_VERSION,
            'os'             => PHP_OS,
            'memory_used_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
            'server_software'=> $_SERVER['SERVER_SOFTWARE'] ?? 'LiteSpeed/Nginx/Apache',
        ]
    ]);
}

/**
 * User administration: list, search, ban/unban, quota adjustment, role change.
 */
function handleAdminUsers(string $method, array $pathParts, array $admin): void {
    $pdo = db();
    $userId = isset($pathParts[2]) ? (int)$pathParts[2] : null;
    $action = $pathParts[3] ?? null;

    if ($userId && $method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];

        // Check target user exists
        $stmt = $pdo->prepare('SELECT id, email, role, is_banned, storage_quota FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $targetUser = $stmt->fetch();
        if (!$targetUser) jsonError('User not found', 404);

        if ($action === 'ban') {
            if ((int)$targetUser['id'] === (int)$admin['id']) {
                jsonError('You cannot ban your own administrator account', 400);
            }
            $newBanned = empty($targetUser['is_banned']) ? 1 : 0;
            $pdo->prepare('UPDATE users SET is_banned = ? WHERE id = ?')->execute([$newBanned, $userId]);
            $actionLabel = $newBanned ? 'USER_BANNED' : 'USER_UNBANNED';
            logAudit((int)$admin['id'], $actionLabel, 'user', (string)$userId, "Admin {$admin['email']} {$actionLabel} user {$targetUser['email']}");
            jsonSuccess(['message' => $newBanned ? 'User has been banned' : 'User ban removed', 'is_banned' => $newBanned]);
        }

        if ($action === 'quota') {
            $quotaMb = isset($body['quota_mb']) ? max(100, (int)$body['quota_mb']) : 10240;
            $quotaBytes = $quotaMb * 1024 * 1024;
            $pdo->prepare('UPDATE users SET storage_quota = ? WHERE id = ?')->execute([$quotaBytes, $userId]);
            logAudit((int)$admin['id'], 'USER_QUOTA_UPDATED', 'user', (string)$userId, "Quota set to {$quotaMb} MB for {$targetUser['email']}");
            jsonSuccess(['message' => "Quota updated to {$quotaMb} MB", 'storage_quota' => $quotaBytes]);
        }

        if ($action === 'role') {
            if ((int)$targetUser['id'] === (int)$admin['id']) {
                jsonError('You cannot modify your own role', 400);
            }
            $newRole = ($targetUser['role'] === 'admin') ? 'user' : 'admin';
            $pdo->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$newRole, $userId]);
            logAudit((int)$admin['id'], 'USER_ROLE_CHANGED', 'user', (string)$userId, "Role changed to {$newRole} for {$targetUser['email']}");
            jsonSuccess(['message' => "Role updated to {$newRole}", 'role' => $newRole]);
        }

        if ($action === 'reset-password') {
            $newPass = trim($body['new_password'] ?? '');
            if (strlen($newPass) < 8) {
                jsonError('Password must be at least 8 characters', 400);
            }
            $hash = password_hash($newPass, PASSWORD_BCRYPT);
            $pdo->prepare('UPDATE users SET password = ? WHERE id = ?')->execute([$hash, $userId]);
            logAudit((int)$admin['id'], 'USER_PASSWORD_RESET', 'user', (string)$userId, "Admin reset password for {$targetUser['email']}");
            jsonSuccess(['message' => "Password successfully reset for {$targetUser['email']}"]);
        }

        jsonError('Invalid action', 400);
    }

    // Default: List users with search & usage stats
    $search = trim($_GET['q'] ?? '');
    $limit  = min(100, max(10, (int)($_GET['limit'] ?? 50)));
    $offset = max(0, (int)($_GET['offset'] ?? 0));

    $where = '';
    $params = [];
    if ($search !== '') {
        $where = 'WHERE u.email LIKE ? OR u.display_name LIKE ?';
        $params = ["%{$search}%", "%{$search}%"];
    }

    $countSql = "SELECT COUNT(*) FROM users u {$where}";
    $stmt = $pdo->prepare($countSql);
    $stmt->execute($params);
    $total = (int)$stmt->fetchColumn();

    $sql = "
        SELECT 
            u.id, 
            u.email, 
            u.display_name, 
            u.role, 
            u.is_verified, 
            COALESCE(u.is_banned, 0) as is_banned,
            COALESCE(u.storage_quota, 10737418240) as storage_quota,
            u.created_at,
            COUNT(f.id) as total_files,
            COALESCE(SUM(f.size_bytes), 0) as storage_used_bytes
        FROM users u
        LEFT JOIN files f ON f.user_id = u.id
        {$where}
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT {$limit} OFFSET {$offset}
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $users = $stmt->fetchAll();

    jsonSuccess([
        'users'  => $users,
        'total'  => $total,
        'limit'  => $limit,
        'offset' => $offset,
    ]);
}

/**
 * File governance: list across all users, block/unblock, delete.
 */
function handleAdminFiles(string $method, array $pathParts, array $admin): void {
    $pdo = db();
    $fileId = isset($pathParts[2]) ? (int)$pathParts[2] : null;
    $action = $pathParts[3] ?? null;

    if ($fileId) {
        $stmt = $pdo->prepare('SELECT f.*, u.email as owner_email FROM files f JOIN users u ON u.id = f.user_id WHERE f.id = ?');
        $stmt->execute([$fileId]);
        $file = $stmt->fetch();
        if (!$file) jsonError('File not found', 404);

        if ($method === 'POST' && $action === 'block') {
            $newBlocked = empty($file['is_blocked']) ? 1 : 0;
            $pdo->prepare('UPDATE files SET is_blocked = ? WHERE id = ?')->execute([$newBlocked, $fileId]);
            $actionLabel = $newBlocked ? 'FILE_BLOCKED' : 'FILE_UNBLOCKED';
            logAudit((int)$admin['id'], $actionLabel, 'file', (string)$fileId, "File '{$file['original_name']}' ({$file['owner_email']}) {$actionLabel}");
            jsonSuccess(['message' => $newBlocked ? 'File download blocked' : 'File unblocked', 'is_blocked' => $newBlocked]);
        }

        if ($method === 'DELETE') {
            $pdo->prepare('DELETE FROM files WHERE id = ?')->execute([$fileId]);
            logAudit((int)$admin['id'], 'FILE_DELETED', 'file', (string)$fileId, "Force deleted file '{$file['original_name']}' owned by {$file['owner_email']}");
            jsonSuccess(['message' => "File '{$file['original_name']}' deleted successfully"]);
        }

        jsonError('Invalid file action', 400);
    }

    // List files
    $search = trim($_GET['q'] ?? '');
    $limit  = min(100, max(10, (int)($_GET['limit'] ?? 50)));
    $offset = max(0, (int)($_GET['offset'] ?? 0));

    $where = 'WHERE 1=1';
    $params = [];
    if ($search !== '') {
        $where .= ' AND (f.original_name LIKE ? OR u.email LIKE ? OR f.telegram_file_id LIKE ?)';
        $params = ["%{$search}%", "%{$search}%", "%{$search}%"];
    }

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM files f JOIN users u ON u.id = f.user_id {$where}");
    $stmt->execute($params);
    $total = (int)$stmt->fetchColumn();

    $stmt = $pdo->prepare("
        SELECT 
            f.id,
            f.user_id,
            u.email as owner_email,
            f.original_name,
            f.mime_type,
            f.size_bytes,
            f.telegram_file_id,
            f.share_token,
            f.is_public,
            COALESCE(f.is_blocked, 0) as is_blocked,
            COALESCE(f.downloads, 0) as downloads,
            f.created_at
        FROM files f
        JOIN users u ON u.id = f.user_id
        {$where}
        ORDER BY f.created_at DESC
        LIMIT {$limit} OFFSET {$offset}
    ");
    $stmt->execute($params);
    $files = $stmt->fetchAll();

    jsonSuccess([
        'files'  => $files,
        'total'  => $total,
        'limit'  => $limit,
        'offset' => $offset,
    ]);
}

/**
 * System settings: read and batch-update platform core parameters.
 */
function handleAdminSettings(string $method, array $admin): void {
    $pdo = db();

    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $allowedKeys = [
            'site_name',
            'site_description',
            'maintenance_mode',
            'maintenance_message',
            'max_upload_size_mb',
            'allowed_extensions',
            'default_storage_quota_mb',
            'allow_guest_download',
            'announcement_banner',
            'telegram_storage_enabled',
            'smtp_host',
            'smtp_port',
            'smtp_user',
            'smtp_from',
        ];

        $updatedCount = 0;
        foreach ($body as $k => $v) {
            if (in_array($k, $allowedKeys, true)) {
                setSystemSetting($k, (string)$v);
                $updatedCount++;
            }
        }

        logAudit((int)$admin['id'], 'SETTINGS_UPDATED', 'system', 'settings', "Updated {$updatedCount} platform setting(s)");
        jsonSuccess(['message' => 'Settings saved successfully', 'updated' => $updatedCount]);
    }

    // GET: Return all settings as key-value pairs
    $stmt = $pdo->query('SELECT key, value, updated_at FROM system_settings');
    $rows = $stmt->fetchAll();
    $settings = [];
    foreach ($rows as $r) {
        $settings[$r['key']] = $r['value'];
    }

    jsonSuccess(['settings' => $settings]);
}

/**
 * Audit logs: fetch recent admin activity.
 */
function handleAdminAuditLogs(): void {
    $stmt = db()->query('
        SELECT a.id, a.action, a.target_type, a.target_id, a.details, a.ip_address, a.created_at, u.email as admin_email
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.admin_id
        ORDER BY a.created_at DESC
        LIMIT 100
    ');
    $logs = $stmt->fetchAll();

    jsonSuccess(['audit_logs' => $logs]);
}

/**
 * System Health: database ping, Telegram API ping, disk space, memory.
 */
function handleAdminHealth(): void {
    $start = microtime(true);
    $dbOk = false;
    try {
        db()->query('SELECT 1')->fetch();
        $dbOk = true;
    } catch (Exception $e) {}
    $dbLatency = round((microtime(true) - $start) * 1000, 2);

    // Telegram API probe
    $tgOk = false;
    $tgBotUser = null;
    $tgLatency = 0;
    if (TELEGRAM_BOT_TOKEN) {
        $tgStart = microtime(true);
        $ch = curl_init("https://api.telegram.org/bot" . TELEGRAM_BOT_TOKEN . "/getMe");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 4,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $res = curl_exec($ch);
        $tgLatency = round((microtime(true) - $tgStart) * 1000, 2);
        if ($res) {
            $data = json_decode($res, true);
            if (!empty($data['ok'])) {
                $tgOk = true;
                $tgBotUser = $data['result']['username'] ?? 'Bot';
            }
        }
        curl_close($ch);
    }

    // Disk space
    $diskFree = @disk_free_space(__DIR__);
    $diskTotal = @disk_total_space(__DIR__);

    jsonSuccess([
        'health' => [
            'database' => [
                'status'  => $dbOk ? 'healthy' : 'degraded',
                'latency_ms' => $dbLatency,
                'driver'  => 'SQLite3 PDO',
            ],
            'telegram_api' => [
                'status'     => $tgOk ? 'connected' : (TELEGRAM_BOT_TOKEN ? 'unreachable' : 'unconfigured'),
                'bot_username' => $tgBotUser,
                'latency_ms' => $tgLatency,
            ],
            'system' => [
                'php_version'    => PHP_VERSION,
                'os'             => PHP_OS,
                'memory_usage_mb'=> round(memory_get_usage(true) / 1024 / 1024, 2),
                'disk_free_bytes'=> $diskFree !== false ? $diskFree : null,
                'disk_total_bytes'=> $diskTotal !== false ? $diskTotal : null,
                'upload_max_filesize' => ini_get('upload_max_filesize'),
                'post_max_size'       => ini_get('post_max_size'),
            ]
        ]
    ]);
}

/**
 * Purge rate limits table and temporary cache.
 */
function handleAdminCacheClear(array $admin): void {
    $count = db()->exec('DELETE FROM rate_limits');
    logAudit((int)$admin['id'], 'CACHE_CLEARED', 'system', 'rate_limits', "Admin flushed {$count} rate limit records");
    jsonSuccess(['message' => "Flushed {$count} rate limit / cache records"]);
}
