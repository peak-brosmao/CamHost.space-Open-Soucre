<?php
// =============================================
// CamHost.space — Enterprise JWT & Security Auth
// Developer: PEAK BROSMAO · peakbrosmao.me
// =============================================

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/security.php';

// ── JWT Utilities ──────────────────────────────────────────────

/**
 * Create a JWT token for a user (expires in 7 days).
 */
function jwt_create(array $payload): string {
    $header  = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload['iat'] = time();
    $payload['exp'] = time() + 60 * 60 * 24 * 7; // 7 days
    $body    = base64url_encode(json_encode($payload));
    $sig     = base64url_encode(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));
    return "$header.$body.$sig";
}

/**
 * Verify and decode a JWT token. Returns payload array or null on failure.
 */
function jwt_verify(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header, $body, $sig] = $parts;
    $expected = base64url_encode(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));

    // Constant-time comparison to prevent timing attacks
    if (!secureTokenCompare($expected, $sig)) return null;

    $payload = json_decode(base64url_decode($body), true);
    if (!$payload || $payload['exp'] < time()) return null;

    return $payload;
}

function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
}

// ── Auth Middleware ──────────────────────────────────────────────

/**
 * Require a valid JWT from Authorization header.
 * Returns the user row from DB, or sends 401 and exits.
 */
function requireAuth(): array {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$auth) {
        $auth = 'Bearer ' . ($_GET['token'] ?? '');
    }

    if (!preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) {
        jsonError('Unauthorized — no token provided', 401);
    }

    $payload = jwt_verify($m[1]);
    if (!$payload) {
        jsonError('Unauthorized — invalid or expired token', 401);
    }

    $user = db()->prepare('SELECT * FROM users WHERE id = ?');
    $user->execute([$payload['sub']]);
    $user = $user->fetch();

    if (!$user) {
        jsonError('Unauthorized — user not found', 401);
    }

    if (!empty($user['is_banned'])) {
        jsonError('Your account has been suspended by an administrator.', 403, ['banned' => true]);
    }

    return $user;
}

function requireVerified(): array {
    $user = requireAuth();
    if ($user['role'] !== 'admin') {
        $reqVerify = false;
        try {
            $stmt = db()->prepare('SELECT value FROM system_settings WHERE key = ?');
            $stmt->execute(['require_email_verification']);
            $val = $stmt->fetchColumn();
            $reqVerify = ($val === '1');
        } catch (Exception $e) {}

        if ($reqVerify && empty($user['is_verified'])) {
            jsonError('Your account has not been activated yet. Please click the verification link sent to your email.', 403, [
                'unverified' => true,
                'email'      => $user['email'],
            ]);
        }
    }
    return $user;
}

/**
 * Require admin role.
 */
function requireAdmin(): array {
    $user = requireAuth();
    if (($user['role'] ?? '') !== 'admin') {
        jsonError('Forbidden: Administrator access required', 403);
    }
    return $user;
}

// ── User Profile Builder ────────────────────────────────────────

/**
 * Builds full user profile with accurate real-time storage metrics.
 */
function buildUserProfile(array $user): array {
    // Storage used
    $stmt = db()->prepare('SELECT COALESCE(SUM(size_bytes), 0) FROM files WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $storageUsedBytes = (int)$stmt->fetchColumn();

    // Default storage quota setting
    $defStmt = db()->prepare('SELECT value FROM system_settings WHERE key = ?');
    $defStmt->execute(['default_storage_quota_mb']);
    $defRow = $defStmt->fetch();
    $defaultQuotaMb = !empty($defRow['value']) ? (int)$defRow['value'] : 10240;
    $defaultQuotaBytes = $defaultQuotaMb * 1024 * 1024;

    // Effective quota
    $storageQuotaBytes = (int)($user['storage_quota'] ?? 0);
    if ($storageQuotaBytes <= 0) {
        $storageQuotaBytes = $defaultQuotaBytes;
    }
    $storageQuotaMb = round($storageQuotaBytes / 1024 / 1024);
    $storageUsedMb  = round($storageUsedBytes / 1024 / 1024, 2);
    $percent = $storageQuotaBytes > 0 ? min(100, round(($storageUsedBytes / $storageQuotaBytes) * 100, 1)) : 0;

    // Plan determination
    if (($user['role'] ?? '') === 'admin') {
        $plan = 'Unlimited Pro';
    } elseif ($storageQuotaMb > 20480) {
        $plan = 'Pro Tier (' . round($storageQuotaMb / 1024) . ' GB)';
    } else {
        $plan = 'Standard Plan (' . round($storageQuotaMb / 1024) . ' GB)';
    }

    return [
        'id'                  => (int)$user['id'],
        'email'               => $user['email'],
        'display_name'        => $user['display_name'] ?? '',
        'role'                => $user['role'],
        'is_verified'         => (int)($user['is_verified'] ?? 1),
        'is_banned'           => (int)($user['is_banned'] ?? 0),
        'storage_quota'       => $storageQuotaBytes,
        'storage_quota_mb'    => $storageQuotaMb,
        'storage_quota_human' => formatBytes($storageQuotaBytes),
        'storage_used'        => $storageUsedBytes,
        'storage_used_mb'     => $storageUsedMb,
        'storage_used_human'  => formatBytes($storageUsedBytes),
        'storage_percent'     => $percent,
        'default_quota_mb'    => $defaultQuotaMb,
        'plan'                => $plan,
        'created_at'          => $user['created_at'] ?? null,
    ];
}

// ── Route Handlers ──────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Protected against brute-force (max 5 failed attempts per 15 min).
 */
function handleLogin(): void {
    enforceRateLimit('login', 30, 300);

    $body = json_decode(file_get_contents('php://input'), true);
    $email    = trim($body['email']    ?? '');
    $password = trim($body['password'] ?? '');

    if (!$email || !$password) {
        jsonError('Email and password are required', 400);
    }

    $stmt = db()->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        jsonError('Invalid email or password', 401);
    }

    // Clear rate limit immediately on successful password verification
    clearRateLimit('login');

    // Check if account is suspended
    if (!empty($user['is_banned'])) {
        jsonError('Your account has been suspended by an administrator.', 403, [
            'banned' => true,
        ]);
    }

    // Check if account is verified
    if ($user['role'] !== 'admin' && empty($user['is_verified'])) {
        jsonError('Account not activated. Please use the activation link sent to you.', 403, [
            'unverified' => true,
            'email'      => $user['email'],
        ]);
    }

    $token = jwt_create(['sub' => $user['id'], 'email' => $user['email'], 'role' => $user['role']]);

    jsonSuccess([
        'token' => $token,
        'user'  => buildUserProfile($user),
    ]);
}

/**
 * POST /auth/register
 * Body: { email, password, confirm_password }
 * Generates secure activation token with 24-hour expiration.
 */
function handleRegister(): void {
    enforceRateLimit('register', 5, 3600);

    $body     = json_decode(file_get_contents('php://input'), true);
    $email    = trim($body['email']            ?? '');
    $password = trim($body['password']         ?? '');
    $confirm  = trim($body['confirm_password'] ?? '');

    if (!$email || !$password) jsonError('Email and password are required', 400);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonError('Invalid email address', 422);
    if (strlen($password) < 8) jsonError('Password must be at least 8 characters', 400);
    if ($password !== $confirm) jsonError('Passwords do not match', 400);

    try {
        $hash          = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $verifyToken   = generateSecureToken(32);
        $verifyExpires = time() + 86400; // 24 hours

        $stmt = db()->prepare('
            INSERT INTO users (email, password, role, is_verified, verification_token, verification_expires)
            VALUES (?, ?, ?, 0, ?, ?)
        ');
        $stmt->execute([$email, $hash, 'user', $verifyToken, $verifyExpires]);
        $newId = (int)db()->lastInsertId();

        $verifyUrl = FRONTEND_URL . '/verify-account?token=' . $verifyToken;

        require_once __DIR__ . '/mailer.php';
        $emailResult = sendActivationEmail($email, $verifyUrl);

        jsonSuccess([
            'requires_verification' => true,
            'verification_url'      => $verifyUrl,
            'token'                 => $verifyToken,
            'email_sent'            => $emailResult['sent'] ?? false,
            'user'                  => ['id' => $newId, 'email' => $email, 'role' => 'user'],
            'message'               => ($emailResult['sent'] ?? false)
                ? 'Account created! An activation link has been sent to your email from support@camhost.space.'
                : 'Account created! Please verify your account using the activation link.',
        ], 201);
    } catch (PDOException $e) {
        if (str_contains($e->getMessage(), 'UNIQUE')) {
            jsonError('An account with this email already exists', 409);
        }
        throw $e;
    }
}

/**
 * GET or POST /api/auth/verify
 * Parameters: token (via query or body)
 * Activates the user account and returns valid JWT session.
 */
function handleVerifyAccount(): void {
    enforceRateLimit('verify', 10, 60);

    $token = trim($_GET['token'] ?? '');
    if (!$token) {
        $body = json_decode(file_get_contents('php://input'), true);
        $token = trim($body['token'] ?? '');
    }

    if (!$token) {
        jsonError('Verification token is required', 400);
    }

    $stmt = db()->prepare('SELECT * FROM users WHERE verification_token = ?');
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user || !secureTokenCompare($user['verification_token'], $token)) {
        jsonError('Invalid or already used verification token', 400);
    }

    if (!empty($user['verification_expires']) && time() > (int)$user['verification_expires']) {
        jsonError('Verification token has expired. Please request a new activation link.', 410, [
            'expired' => true,
            'email'   => $user['email'],
        ]);
    }

    // Activate account and clear token
    $update = db()->prepare('UPDATE users SET is_verified = 1, verification_token = NULL, verification_expires = NULL WHERE id = ?');
    $update->execute([$user['id']]);

    // Issue JWT token immediately
    $jwt = jwt_create(['sub' => $user['id'], 'email' => $user['email'], 'role' => $user['role']]);

    jsonSuccess([
        'verified' => true,
        'token'    => $jwt,
        'user'     => buildUserProfile($user),
        'message'  => 'Account successfully verified and activated!',
    ]);
}

/**
 * POST /api/auth/resend-verification
 * Body: { email }
 * Resends a new activation link if account is unverified.
 */
function handleResendVerification(): void {
    enforceRateLimit('resend_verify', 3, 900);

    $body  = json_decode(file_get_contents('php://input'), true);
    $email = trim($body['email'] ?? '');

    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonError('A valid email address is required', 400);
    }

    $stmt = db()->prepare('SELECT id, email, is_verified FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && empty($user['is_verified'])) {
        $newToken   = generateSecureToken(32);
        $newExpires = time() + 86400; // 24 hours

        $update = db()->prepare('UPDATE users SET verification_token = ?, verification_expires = ? WHERE id = ?');
        $update->execute([$newToken, $newExpires, $user['id']]);

        $verifyUrl = FRONTEND_URL . '/verify-account?token=' . $newToken;

        require_once __DIR__ . '/mailer.php';
        $emailResult = sendActivationEmail($user['email'], $verifyUrl);

        jsonSuccess([
            'sent'             => true,
            'verification_url' => $verifyUrl,
            'email_sent'       => $emailResult['sent'] ?? false,
            'message'          => ($emailResult['sent'] ?? false)
                ? 'A fresh activation link has been sent to ' . $user['email'] . ' from support@camhost.space.'
                : 'A fresh activation link has been generated.',
        ]);
    }

    // Generic response to prevent user enumeration
    jsonSuccess([
        'sent'    => true,
        'message' => 'If an unverified account exists with that email, an activation link has been prepared.',
    ]);
}

/**
 * GET /api/auth/me — verify token and return user info
 */
function handleMe(): void {
    $user = requireAuth();
    jsonSuccess(buildUserProfile($user));
}

/**
 * PUT /api/auth/profile — update display name / profile info
 */
function handleUpdateProfile(): void {
    $user = requireAuth();
    $body = json_decode(file_get_contents('php://input'), true);
    $displayName = trim($body['display_name'] ?? '');
    $email       = trim($body['email'] ?? '');

    if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonError('Invalid email address', 422);
    }

    try {
        $stmt = db()->prepare('UPDATE users SET display_name = ?, email = COALESCE(NULLIF(?, ""), email) WHERE id = ?');
        $stmt->execute([$displayName, $email, $user['id']]);

        $updated = db()->prepare('SELECT * FROM users WHERE id = ?');
        $updated->execute([$user['id']]);
        $userRow = $updated->fetch();

        jsonSuccess([
            'user'    => buildUserProfile($userRow),
            'message' => 'Profile updated successfully',
        ]);

    } catch (PDOException $e) {
        if (str_contains($e->getMessage(), 'UNIQUE')) {
            jsonError('This email is already in use by another account', 409);
        }
        throw $e;
    }
}

/**
 * POST /api/auth/change-password
 * Body: { current_password, new_password }
 */
function handleChangePassword(): void {
    $user = requireAuth();
    $body = json_decode(file_get_contents('php://input'), true);
    $current = $body['current_password'] ?? '';
    $new     = $body['new_password']     ?? '';

    if (!$current || !$new) {
        jsonError('current_password and new_password are required', 400);
    }
    if (strlen($new) < 8) {
        jsonError('New password must be at least 8 characters', 400);
    }
    if (!password_verify($current, $user['password'])) {
        jsonError('Current password is incorrect', 401);
    }

    $hash = password_hash($new, PASSWORD_BCRYPT, ['cost' => 12]);
    $stmt = db()->prepare('UPDATE users SET password = ? WHERE id = ?');
    $stmt->execute([$hash, $user['id']]);

    jsonSuccess(['message' => 'Password updated successfully']);
}
