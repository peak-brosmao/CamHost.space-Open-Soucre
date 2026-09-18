<?php
// =======================================================
// CamHost.space — Automated Background Maintenance Cron
// Developer: PEAK BROSMAO · peakbrosmao.me
// =======================================================

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

/**
 * Execute all automated maintenance tasks.
 * @return array summary of actions taken
 */
function runSystemCron(): array {
    $pdo = db();
    $startTime = microtime(true);
    $results = [
        'cleaned_expired_files' => 0,
        'purged_rate_limits'    => 0,
        'wal_optimized'         => false,
        'duration_ms'           => 0,
    ];

    try {
        // 1. Get retention settings
        $stmt = $pdo->prepare("SELECT value FROM system_settings WHERE key = 'guest_file_retention_days'");
        $stmt->execute();
        $retentionDays = max(1, (int)($stmt->fetchColumn() ?: 7));

        $stmt = $pdo->prepare("SELECT value FROM system_settings WHERE key = 'cron_auto_clean_expired'");
        $stmt->execute();
        $autoClean = ($stmt->fetchColumn() !== '0');

        // 2. Clean expired guest files if enabled
        if ($autoClean) {
            $threshold = date('Y-m-d H:i:s', strtotime("-{$retentionDays} days"));
            // Guest files or expired temporary files
            $delStmt = $pdo->prepare("
                DELETE FROM files 
                WHERE (user_id IS NULL OR user_id = 0) 
                  AND created_at < ?
            ");
            $delStmt->execute([$threshold]);
            $results['cleaned_expired_files'] = $delStmt->rowCount();
        }

        // 3. Purge old rate limits (> 24 hours old)
        $rateLimitThreshold = time() - 86400;
        $delRate = $pdo->prepare("DELETE FROM rate_limits WHERE window_start < ?");
        $delRate->execute([$rateLimitThreshold]);
        $results['purged_rate_limits'] = $delRate->rowCount();

        // 4. Optimize SQLite WAL & perform checkpoint
        try {
            $pdo->exec('PRAGMA wal_checkpoint(TRUNCATE)');
            $results['wal_optimized'] = true;
        } catch (Throwable $e) {
            $results['wal_optimized'] = false;
        }

        // Record last cron run timestamp in settings
        $now = date('Y-m-d H:i:s');
        $upd = $pdo->prepare("
            INSERT INTO system_settings (key, value, updated_at)
            VALUES ('last_cron_run', ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
        ");
        $upd->execute([$now]);

    } catch (Throwable $e) {
        $results['error'] = $e->getMessage();
        error_log('[CamHost Cron Error] ' . $e->getMessage());
    }

    $results['duration_ms'] = round((microtime(true) - $startTime) * 1000, 2);
    $results['executed_at'] = date('Y-m-d H:i:s');
    return $results;
}

// If invoked directly via CLI or HTTP
if (php_sapi_name() === 'cli' || (isset($_SERVER['SCRIPT_FILENAME']) && realpath(__FILE__) === realpath($_SERVER['SCRIPT_FILENAME']))) {
    // If HTTP, ensure basic security via admin token or query key
    if (php_sapi_name() !== 'cli') {
        header('Content-Type: application/json; charset=UTF-8');
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        $cronSecret = $_GET['key'] ?? '';
        
        // Allow if valid cron key or Bearer admin token
        $authorized = false;
        if (!empty($cronSecret) && $cronSecret === env('CRON_SECRET', 'camhost_cron_secret')) {
            $authorized = true;
        } elseif (preg_match('/Bearer\s+(.*)$/i', $authHeader, $m)) {
            require_once __DIR__ . '/auth.php';
            $payload = jwt_verify($m[1]);
            if ($payload && ($payload['role'] ?? '') === 'admin') {
                $authorized = true;
            }
        }

        if (!$authorized) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Unauthorized cron invocation']);
            exit;
        }
    }

    $res = runSystemCron();
    echo json_encode(['success' => true, ...$res], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}
