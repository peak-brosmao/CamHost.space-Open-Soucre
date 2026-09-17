<?php
// =============================================
// CamHost.space — API Router / Entry Point
// Developer: PEAK BROSMAO · peakbrosmao.me
// =============================================
// All requests to /api/* are routed here via .htaccess

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/security.php';

// ── Security Inspection & Anti-DDoS ─────────────────────────────
runWafInspection();
enforceRateLimit('api_general', 120, 60);

// ── Strict Origin Security & CORS ───────────────────────────────
$allowedOrigins = array_map('trim', explode(',', ALLOWED_ORIGINS));
$requestOrigin  = $_SERVER['HTTP_ORIGIN'] ?? '';
$requestReferer = $_SERVER['HTTP_REFERER'] ?? '';
$matchedOrigin  = 'https://camhost.space';

if ($requestOrigin) {
    if (in_array($requestOrigin, $allowedOrigins, true)) {
        $matchedOrigin = $requestOrigin;
    } else {
        http_response_code(403);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode([
            'success' => false,
            'error'   => 'Access denied: api.camhost.space is restricted to camhost.space'
        ]);
        exit;
    }
} elseif ($requestReferer) {
    $found = false;
    foreach ($allowedOrigins as $ao) {
        if (str_starts_with($requestReferer, $ao)) {
            $matchedOrigin = $ao;
            $found         = true;
            break;
        }
    }
    if (!$found && preg_match('#^https?://#i', $requestReferer)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode([
            'success' => false,
            'error'   => 'Access denied: api.camhost.space is restricted to camhost.space'
        ]);
        exit;
    }
}

header('Access-Control-Allow-Origin: ' . $matchedOrigin);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, Accept, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Vary: Origin');
header('Content-Type: application/json; charset=UTF-8');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Parse Route ──────────────────────────────────────────────────
// PATH_INFO from .htaccess rewrite: /api/files/3/download → /files/3/download
$rawPath = $_SERVER['PATH_INFO'] ?? parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Strip /api prefix if present (for setups without .htaccess mod_rewrite)
$rawPath = preg_replace('#^/api#', '', $rawPath);
$rawPath = rtrim($rawPath, '/') ?: '/';
$method  = strtoupper($_SERVER['REQUEST_METHOD']);

define('ROUTED_FROM_INDEX', true);

// ── Maintenance Mode Check ───────────────────────────────────────
$isMaintenance = false;
try {
    $stmt = db()->prepare('SELECT value FROM system_settings WHERE key = ?');
    $stmt->execute(['maintenance_mode']);
    $val = $stmt->fetchColumn();
    $isMaintenance = ($val === '1');
} catch (Exception $e) {}

if ($isMaintenance && !str_starts_with($rawPath, '/admin') && $rawPath !== '/auth/login') {
    // Check if bearer token belongs to admin
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $isAdmin = false;
    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        require_once __DIR__ . '/auth.php';
        $payload = jwt_verify($matches[1]);
        if ($payload && ($payload['role'] ?? '') === 'admin') {
            $isAdmin = true;
        }
    }
    if (!$isAdmin) {
        http_response_code(503);
        echo json_encode([
            'success'     => false,
            'error'       => 'CamHost.space is currently undergoing scheduled maintenance. Please check back shortly.',
            'maintenance' => true,
        ]);
        exit;
    }
}

// ── Route Dispatch ───────────────────────────────────────────────
try {

    // ── Health check ──
    if ($rawPath === '/' || $rawPath === '/health') {
        jsonSuccess([
            'app'     => APP_NAME,
            'version' => APP_VERSION,
            'status'  => 'ok',
            'time'    => date('c'),
        ]);
    }

    // ── Admin routes — /admin, /admin/overview, /admin/users, /admin/files, /admin/settings, /admin/health, etc. ──
    if (str_starts_with($rawPath, '/admin')) {
        require __DIR__ . '/admin.php';
        $parts = explode('/', trim($rawPath, '/'));
        handleAdminRoutes($method, $parts);
        exit;
    }

    // ── Auth routes ──
    if ($rawPath === '/auth/login'               && $method === 'POST')  { require __DIR__ . '/auth.php';   handleLogin();              exit; }
    if ($rawPath === '/auth/register'            && $method === 'POST')  { require __DIR__ . '/auth.php';   handleRegister();           exit; }
    if ($rawPath === '/auth/verify')                                     { require __DIR__ . '/auth.php';   handleVerifyAccount();      exit; }
    if ($rawPath === '/auth/resend-verification' && $method === 'POST')  { require __DIR__ . '/auth.php';   handleResendVerification(); exit; }
    if ($rawPath === '/auth/me'                  && $method === 'GET')   { require __DIR__ . '/auth.php';   handleMe();                 exit; }
    if ($rawPath === '/auth/profile'             && $method === 'PUT')   { require __DIR__ . '/auth.php';   handleUpdateProfile();      exit; }
    if ($rawPath === '/auth/change-password'     && $method === 'POST')  { require __DIR__ . '/auth.php';   handleChangePassword();     exit; }

    // ── Signup route ──
    if ($rawPath === '/signup') {
        require __DIR__ . '/signup.php';
        handleSignup($method);
        exit;
    }

    // ── Upload routes — /upload, /upload.php or /files (POST) ──
    if (($rawPath === '/upload' || $rawPath === '/upload.php' || $rawPath === '/files') && $method === 'POST') {
        require __DIR__ . '/upload.php';
        handleUpload();
        exit;
    }

    // ── Folder routes — /folders, /folders/{id} ──
    if (preg_match('#^/folders(?:/(\d+))?$#', $rawPath, $fm)) {
        require __DIR__ . '/folders.php';
        $fid = isset($fm[1]) ? (int)$fm[1] : null;
        if ($fid === null && $method === 'GET')    { handleListFolders();         exit; }
        if ($fid === null && $method === 'POST')   { handleCreateFolder();        exit; }
        if ($fid !== null && $method === 'PUT')    { handleRenameFolder($fid);    exit; }
        if ($fid !== null && $method === 'DELETE') { handleDeleteFolder($fid);    exit; }
    }

    // ── File routes — parse /files, /files/{id}, /files/{id}/download, /files/{id}/move, /files/{id}/rename, /files/{id}/share ──
    if (preg_match('#^/files(?:/(\d+)(?:/(download|move|rename|share))?)?$#', $rawPath, $m)) {
        require __DIR__ . '/files.php';

        $id     = isset($m[1]) ? (int)$m[1] : null;
        $action = $m[2] ?? null;

        if ($id === null && $method === 'GET')                        { handleListFiles();         exit; }
        if ($id !== null && $action === null && $method === 'GET')    { handleGetFile($id);        exit; }
        if ($id !== null && $action === null && $method === 'PUT')    { handleUpdateFile($id);     exit; }
        if ($id !== null && $action === null && $method === 'DELETE') { handleDeleteFile($id);     exit; }
        if ($id !== null && $action === 'download')                   { handleDownloadFile($id);   exit; }
        if ($id !== null && $action === 'rename'  && $method === 'PUT') { handleRenameFile($id);   exit; }
        if ($id !== null && $action === 'share'   && $method === 'POST'){ handleShareFile($id);    exit; }
        if ($id !== null && $action === 'move'    && $method === 'PUT') { handleUpdateFile($id);    exit; }
    }

    // ── Public File Share routes — /share/{token}, /share/{token}/download, /share/{token}/report ──
    if (preg_match('#^/share/([a-zA-Z0-9_-]+)(?:/(download|report))?$#', $rawPath, $sm)) {
        require __DIR__ . '/files.php';
        $token     = $sm[1];
        $subAction = $sm[2] ?? null;

        if ($subAction === null && $method === 'GET') {
            handleGetSharedFile($token);
            exit;
        }
        if ($subAction === 'download') {
            handleDownloadSharedFile($token);
            exit;
        }
        if ($subAction === 'report' && $method === 'POST') {
            handleReportSharedFile($token);
            exit;
        }
    }


    // ── 404 ──
    jsonError('Route not found: ' . $method . ' ' . $rawPath, 404);

} catch (Throwable $e) {
    // Log internally but don't leak stack traces to client
    error_log('[CamHost API Error] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    jsonError('Internal server error', 500);
}

// ── JSON Response Helpers ────────────────────────────────────────

function jsonSuccess(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode(['success' => true, ...$data], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function jsonError(string $message, int $code = 400, array $extra = []): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $message, ...$extra], JSON_UNESCAPED_UNICODE);
    exit;
}
