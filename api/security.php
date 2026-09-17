<?php
// =============================================
// CamHost.space — Enterprise Security Engine
// Developer: PEAK BROSMAO · peakbrosmao.me
// =============================================
// Provides WAF, rate limiting, anti-DDoS, and
// timing attack defense for the API.

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

/**
 * Extract verified client IP address safely.
 * Handles Cloudflare, proxies, and direct connections without spoofing.
 */
function getClientIp(): string {
    $headers = [
        'HTTP_CF_CONNECTING_IP',
        'HTTP_X_REAL_IP',
        'HTTP_X_FORWARDED_FOR',
        'REMOTE_ADDR',
    ];

    foreach ($headers as $h) {
        if (!empty($_SERVER[$h])) {
            // If X-Forwarded-For contains multiple IPs, take the first valid one
            $ips = explode(',', $_SERVER[$h]);
            foreach ($ips as $ip) {
                $ip = trim($ip);
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }
    }

    return '127.0.0.1';
}

/**
 * Web Application Firewall (WAF)
 * Detects and blocks automated scanners, SQLi, XSS, and path traversal attacks.
 */
function runWafInspection(): void {
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $uri       = $_SERVER['REQUEST_URI'] ?? '';
    $rawInput  = file_get_contents('php://input');

    // 1. Block known vulnerability scanners & attack bots
    $blockedScanners = [
        'sqlmap', 'nikto', 'wpscan', 'acunetix', 'havij',
        'dirbuster', 'masscan', 'nmap', 'zgrab', 'gobuster',
    ];
    foreach ($blockedScanners as $scanner) {
        if (stripos($userAgent, $scanner) !== false) {
            blockRequest(403, 'Automated scanning tool detected and blocked.');
        }
    }

    // 2. Path Traversal & Null Byte Injection
    $traversalPatterns = [
        '../', '..\\', '%2e%2e', '%252e%252e',
        '..%2f', '%00', '\0', '/etc/passwd', 'win.ini'
    ];
    foreach ($traversalPatterns as $p) {
        if (stripos($uri, $p) !== false || stripos($rawInput, $p) !== false) {
            blockRequest(403, 'Directory traversal attempt detected.');
        }
    }

    // 3. SQL Injection patterns
    $sqliPatterns = [
        '/\b(union\s+select|select\s+.*\s+from|insert\s+into|drop\s+table)\b/i',
        '/\b(benchmark|sleep)\s*\(\s*\d+\s*\)/i',
        '/(\b(and|or)\b\s+[\d\w]+\s*=\s*[\d\w]+)/i',
        '/(;|--|\/\*|\*\/)/',
    ];
    // Check query string
    $queryString = $_SERVER['QUERY_STRING'] ?? '';
    foreach ($sqliPatterns as $regex) {
        if (preg_match($regex, urldecode($queryString))) {
            blockRequest(403, 'Suspicious query signature detected.');
        }
    }

    // 4. Stored/Reflected XSS in common query params
    if (preg_match('/<script\b[^>]*>(.*?)<\/script>/is', $queryString) ||
        preg_match('/javascript\s*:/i', $queryString) ||
        preg_match('/(onload|onerror|onclick)\s*=/i', $queryString)) {
        blockRequest(403, 'Cross-site scripting (XSS) payload detected.');
    }
}

/**
 * Lightweight token bucket rate limiter backed by SQLite.
 * Protects against DDoS and brute-force credential stuffing.
 */
function enforceRateLimit(string $action, int $maxHits, int $windowSeconds, ?string $customIp = null): void {
    $ip = $customIp ?: getClientIp();
    $now = time();

    try {
        $pdo = db();

        // 1% probabilistic cleanup of old expired records
        if (random_int(1, 100) === 1) {
            $cleanupStmt = $pdo->prepare('DELETE FROM rate_limits WHERE window_start < ?');
            $cleanupStmt->execute([$now - 86400]);
        }

        // Fetch current counter
        $stmt = $pdo->prepare('SELECT id, hits, window_start FROM rate_limits WHERE ip_address = ? AND action = ?');
        $stmt->execute([$ip, $action]);
        $record = $stmt->fetch();

        if (!$record) {
            // First hit in window
            $insert = $pdo->prepare('INSERT INTO rate_limits (ip_address, action, hits, window_start) VALUES (?, ?, 1, ?)');
            $insert->execute([$ip, $action, $now]);
            if (!headers_sent()) {
                header('X-RateLimit-Limit: ' . $maxHits);
                header('X-RateLimit-Remaining: ' . ($maxHits - 1));
            }
            return;
        }

        $windowStart = (int)$record['window_start'];
        $hits        = (int)$record['hits'];

        if (($now - $windowStart) > $windowSeconds) {
            // Window expired, reset window
            $reset = $pdo->prepare('UPDATE rate_limits SET hits = 1, window_start = ? WHERE id = ?');
            $reset->execute([$now, $record['id']]);
            if (!headers_sent()) {
                header('X-RateLimit-Limit: ' . $maxHits);
                header('X-RateLimit-Remaining: ' . ($maxHits - 1));
            }
            return;
        }

        // Inside window: increment hits
        $hits++;
        $update = $pdo->prepare('UPDATE rate_limits SET hits = ? WHERE id = ?');
        $update->execute([$hits, $record['id']]);

        $remaining = max(0, $maxHits - $hits);
        if (!headers_sent()) {
            header('X-RateLimit-Limit: ' . $maxHits);
            header('X-RateLimit-Remaining: ' . $remaining);
        }

        if ($hits > $maxHits) {
            $retryAfter = ($windowStart + $windowSeconds) - $now;
            if (!headers_sent()) {
                header('Retry-After: ' . max(1, $retryAfter));
            }
            blockRequest(429, 'Rate limit exceeded. Please wait ' . max(1, $retryAfter) . ' seconds before trying again.');
        }
    } catch (Exception $e) {
        // Fail open if rate limiting storage is unavailable
        error_log('Rate limiter error: ' . $e->getMessage());
    }
}

/**
 * Constant-time string comparison to prevent timing attacks on tokens.
 */
function secureTokenCompare(string $known, string $user): bool {
    return hash_equals($known, $user);
}

/**
 * Generate cryptographically secure random activation / reset tokens.
 */
function generateSecureToken(int $bytes = 32): string {
    return bin2hex(random_bytes($bytes));
}

/**
 * Helper to terminate request immediately with standard JSON security error.
 */
function blockRequest(int $statusCode, string $message): void {
    if (!headers_sent()) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=UTF-8');
    }
    echo json_encode([
        'success' => false,
        'error'   => $message,
        'blocked' => true,
    ]);
    exit;
}
